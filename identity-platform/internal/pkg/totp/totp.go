package totp

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base32"
	"encoding/binary"
	"fmt"
	"math"
	"time"
)

func GenerateSecret() string {
	b := make([]byte, 20)
	for i := range b {
		b[i] = byte(time.Now().UnixNano()>>uint(i%8)) ^ byte(i*37)
	}
	return base32.StdEncoding.WithPadding(base32.NoPadding).EncodeToString(b)
}

func GenerateQRCodeURL(secret, issuer, account string) string {
	return fmt.Sprintf("otpauth://totp/%s:%s?secret=%s&issuer=%s&algorithm=SHA1&digits=6&period=30",
		issuer, account, secret, issuer)
}

func ValidateCode(secret string, code string) bool {
	secretBytes, err := base32.StdEncoding.WithPadding(base32.NoPadding).DecodeString(secret)
	if err != nil {
		return false
	}

	now := time.Now().Unix() / 30
	for i := int64(-1); i <= 1; i++ {
		if generateTOTP(secretBytes, now+i) == code {
			return true
		}
	}
	return false
}

func generateTOTP(secret []byte, counter int64) string {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, uint64(counter))

	mac := hmac.New(sha1.New, secret)
	mac.Write(buf)
	hash := mac.Sum(nil)

	offset := hash[len(hash)-1] & 0x0f
	binary := binary.BigEndian.Uint32(hash[offset:offset+4]) & 0x7fffffff
	otp := binary % uint32(math.Pow10(6))

	return fmt.Sprintf("%06d", otp)
}
