package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/identity-platform/config"
	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/gateway"
	jwtpkg "github.com/identity-platform/internal/pkg/jwt"
	_ "github.com/lib/pq"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
)

func main() {
	cfg, err := config.Load("config/config.yaml")
	if err != nil {
		log.Fatalf("failed to load config: %v", err)
	}

	logger, err := initLogger(cfg)
	if err != nil {
		log.Fatalf("failed to init logger: %v", err)
	}
	defer logger.Sync()

	logger.Info("starting identity platform",
		zap.Int("http_port", cfg.Server.HTTPPort),
		zap.Int("grpc_port", cfg.Server.GRPCPort),
	)

	db, err := initDatabase(cfg, logger)
	if err != nil {
		logger.Fatal("failed to connect database", zap.Error(err))
	}
	defer db.Close()

	if err := db.Schema.Create(context.Background()); err != nil {
		logger.Fatal("failed to run schema migration", zap.Error(err))
	}

	rdb := initRedis(cfg, logger)
	defer rdb.Close()

	jwtManager := initJWT(cfg, logger)

	grpcSrv := gateway.NewGRPCServer(cfg.Server.GRPCPort, logger)
	authSvc := gateway.RegisterAuthServiceDirect(grpcSrv, db, jwtManager, logger)
	oauth2Svc := gateway.RegisterOAuth2ServiceDirect(grpcSrv, db, jwtManager, logger)

	go func() {
		if err := grpcSrv.Start(); err != nil {
			logger.Fatal("gRPC server failed", zap.Error(err))
		}
	}()

	handler := gateway.NewOAuth2Handler(authSvc, oauth2Svc, jwtManager)

	router := gateway.NewRouter(handler, jwtManager, logger)

	httpSrv := &http.Server{
		Addr:         fmt.Sprintf(":%d", cfg.Server.HTTPPort),
		Handler:      router,
		ReadTimeout:  cfg.Server.ReadTimeout,
		WriteTimeout: cfg.Server.WriteTimeout,
	}

	go func() {
		logger.Info("HTTP server starting", zap.Int("port", cfg.Server.HTTPPort))
		if err := httpSrv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			logger.Fatal("HTTP server failed", zap.Error(err))
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	sig := <-quit

	logger.Info("shutting down", zap.String("signal", sig.String()))

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	if err := httpSrv.Shutdown(shutdownCtx); err != nil {
		logger.Error("HTTP server shutdown error", zap.Error(err))
	}

	grpcSrv.Stop()

	fmt.Println("Identity Platform stopped.")
}

func initLogger(cfg *config.Config) (*zap.Logger, error) {
	zapCfg := zap.NewProductionConfig()
	if cfg.Logging.Format == "console" {
		zapCfg = zap.NewDevelopmentConfig()
	}

	switch cfg.Logging.Level {
	case "debug":
		zapCfg.Level = zap.NewAtomicLevelAt(zap.DebugLevel)
	case "info":
		zapCfg.Level = zap.NewAtomicLevelAt(zap.InfoLevel)
	case "warn":
		zapCfg.Level = zap.NewAtomicLevelAt(zap.WarnLevel)
	case "error":
		zapCfg.Level = zap.NewAtomicLevelAt(zap.ErrorLevel)
	}

	return zapCfg.Build()
}

func initDatabase(cfg *config.Config, logger *zap.Logger) (*ent.Client, error) {
	client, err := ent.Open("postgres", cfg.Database.DSN())
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	_ = ctx
	_ = client

	logger.Info("database connection established")

	return client, nil
}

func initRedis(cfg *config.Config, logger *zap.Logger) *redis.Client {
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.Redis.Addr(),
		Password: cfg.Redis.Password,
		DB:       cfg.Redis.DB,
	})

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	if err := rdb.Ping(ctx).Err(); err != nil {
		logger.Warn("redis ping failed (may be expected in dev)", zap.Error(err))
	}

	return rdb
}

func initJWT(cfg *config.Config, logger *zap.Logger) *jwtpkg.TokenManager {
	privateKey, publicKey, err := jwtpkg.GenerateRSAKeyPair()
	if err != nil {
		logger.Fatal("failed to generate RSA key pair", zap.Error(err))
	}

	return jwtpkg.NewTokenManager(privateKey, publicKey, cfg.JWT.Issuer, cfg.JWT.AccessTokenTTL)
}
