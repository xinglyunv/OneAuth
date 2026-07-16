package main

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"html/template"
	"log"
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/identity-platform/sdk"
)

var (
	oauthClient    *identity.Client
	tokenStore     = &sync.Map{}
	codeVerifiers  = &sync.Map{}
	stateStore     = &sync.Map{}
	issuerURL      = "http://localhost:8080"
	clientID       = "example-gin-app"
	clientSecret   = ""
	redirectURI    = "http://localhost:9000/callback"
	jwksURL        = "http://localhost:8080/.well-known/jwks.json"
)

func main() {
	oauthClient = identity.New(issuerURL, clientID, redirectURI,
		identity.WithClientSecret(clientSecret),
		identity.WithScopes("openid", "profile", "email"),
	)

	gin.SetMode(gin.ReleaseMode)
	r := gin.Default()
	r.SetTrustedProxies(nil)

	r.GET("/", homeHandler)
	r.GET("/login", loginHandler)
	r.GET("/callback", callbackHandler)
	r.GET("/profile", profileHandler)
	r.GET("/logout", logoutHandler)

	log.Println("Example app starting on :9000")
	if err := r.Run(":9000"); err != nil {
		log.Fatal(err)
	}
}

func homeHandler(c *gin.Context) {
	sessionToken := c.Query("token")
	data := gin.H{"loggedIn": false}
	if sessionToken != "" {
		if _, ok := tokenStore.Load(sessionToken); ok {
			data["loggedIn"] = true
			data["token"] = sessionToken
		}
	}
	renderTemplate(c, "home", data)
}

func loginHandler(c *gin.Context) {
	state := generateState()
	codeVerifier, codeChallenge, err := identity.GeneratePKCE()
	if err != nil {
		c.String(http.StatusInternalServerError, "PKCE generation failed")
		return
	}
	stateStore.Store(state, true)
	codeVerifiers.Store(state, codeVerifier)

	authURL, err := oauthClient.AuthCodeURL(context.Background(), state, codeChallenge)
	if err != nil {
		c.String(http.StatusInternalServerError, "Auth URL generation failed")
		return
	}
	c.Redirect(http.StatusFound, authURL)
}

func callbackHandler(c *gin.Context) {
	code := c.Query("code")
	state := c.Query("state")

	if _, ok := stateStore.LoadAndDelete(state); !ok {
		c.String(http.StatusBadRequest, "Invalid state")
		return
	}
	codeVerifier, ok := codeVerifiers.LoadAndDelete(state)
	if !ok {
		c.String(http.StatusBadRequest, "No code verifier found")
		return
	}

	tokens, err := oauthClient.Exchange(context.Background(), code, codeVerifier.(string))
	if err != nil {
		c.String(http.StatusInternalServerError, "Token exchange failed: "+err.Error())
		return
	}

	sessionToken := generateState()
	tokenStore.Store(sessionToken, tokens)
	c.Redirect(http.StatusFound, "/?token="+sessionToken)
}

func profileHandler(c *gin.Context) {
	sessionToken := c.Query("token")
	if sessionToken == "" {
		c.Redirect(http.StatusFound, "/")
		return
	}
	tokensRaw, ok := tokenStore.Load(sessionToken)
	if !ok {
		c.Redirect(http.StatusFound, "/")
		return
	}
	tokens := tokensRaw.(*identity.TokenSet)

	userInfo, err := oauthClient.UserInfo(context.Background(), tokens.AccessToken)
	if err != nil {
		c.String(http.StatusInternalServerError, "UserInfo failed: "+err.Error())
		return
	}
	renderTemplate(c, "profile", gin.H{
		"userInfo": userInfo,
		"token":    sessionToken,
	})
}

func logoutHandler(c *gin.Context) {
	sessionToken := c.Query("token")
	if sessionToken != "" {
		tokenStore.Delete(sessionToken)
	}
	c.Redirect(http.StatusFound, "/")
}

func renderTemplate(c *gin.Context, name string, data gin.H) {
	tmpl := template.Must(template.New(name).Parse(templates[name]))
	tmpl.Execute(c.Writer, data)
}

func generateState() string {
	b := make([]byte, 32)
	rand.Read(b)
	return base64.RawURLEncoding.EncodeToString(b)
}

var templates = map[string]string{
	"home": `<!DOCTYPE html>
<html><head><title>Example App</title>
<style>body{font-family:sans-serif;max-width:600px;margin:50px auto;padding:0 20px}</style></head>
<body>
<h1>Example App</h1>
{{if .loggedIn}}
<p>您已登录！</p>
<a href="/profile?token={{.token}}">查看个人资料</a>
<a href="/logout?token={{.token}}" style="margin-left:12px">登出</a>
{{else}}
<p>请使用身份平台登录：</p>
<a href="/login">使用 SSO 登录</a>
{{end}}
</body></html>`,
	"profile": `<!DOCTYPE html>
<html><head><title>个人资料</title>
<style>body{font-family:sans-serif;max-width:600px;margin:50px auto;padding:0 20px}dl{background:#f5f5f5;padding:16px;border-radius:8px}dt{font-weight:bold;margin-top:8px}dd{margin-left:0}</style></head>
<body>
<h1>用户信息</h1>
<dl>
{{range $k, $v := .userInfo}}
<dt>{{$k}}</dt>
<dd>{{$v}}</dd>
{{end}}
</dl>
<a href="/?token={{.token}}">返回首页</a>
<a href="/logout?token={{.token}}" style="margin-left:12px">登出</a>
</body></html>`,
}
