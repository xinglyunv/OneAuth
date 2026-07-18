package gateway

import (
	"context"
	"fmt"
	"net"

	"github.com/identity-platform/internal/auth"
	"github.com/identity-platform/internal/ent"
	"github.com/identity-platform/internal/oauth2"
	jwtpkg "github.com/identity-platform/internal/pkg/jwt"
	pbauth "github.com/identity-platform/proto/auth"
	pboauth2 "github.com/identity-platform/proto/oauth2"
	"github.com/redis/go-redis/v9"
	"go.uber.org/zap"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"
	"google.golang.org/grpc/status"
)

type GRPCServer struct {
	server *grpc.Server
	port   int
	logger *zap.Logger
}

func NewGRPCServer(port int, logger *zap.Logger) *GRPCServer {
	server := grpc.NewServer(
		grpc.ChainUnaryInterceptor(
			grpcRecoveryInterceptor(logger),
			grpcLoggingInterceptor(logger),
		),
	)

	reflection.Register(server)

	return &GRPCServer{
		server: server,
		port:   port,
		logger: logger,
	}
}

func (s *GRPCServer) RegisterAuthService(client *ent.Client, jwt *jwtpkg.TokenManager, rdb redis.UniversalClient) {
	authSvc := auth.NewService(client, jwt, s.logger, rdb)
	pbauth.RegisterAuthServiceServer(s.server, authSvc)
}

func RegisterAuthServiceDirect(s *GRPCServer, client *ent.Client, jwt *jwtpkg.TokenManager, logger *zap.Logger, rdb redis.UniversalClient) *auth.Service {
	authSvc := auth.NewService(client, jwt, logger, rdb)
	pbauth.RegisterAuthServiceServer(s.server, authSvc)
	return authSvc
}

func (s *GRPCServer) RegisterOAuth2Service(client *ent.Client, jwt *jwtpkg.TokenManager) {
	oauth2Svc := oauth2.NewService(client, jwt, s.logger)
	pboauth2.RegisterOAuth2ServiceServer(s.server, oauth2Svc)
}

func RegisterOAuth2ServiceDirect(s *GRPCServer, client *ent.Client, jwt *jwtpkg.TokenManager, logger *zap.Logger) *oauth2.Service {
	oauth2Svc := oauth2.NewService(client, jwt, logger)
	pboauth2.RegisterOAuth2ServiceServer(s.server, oauth2Svc)
	return oauth2Svc
}

func (s *GRPCServer) Start() error {
	lis, err := net.Listen("tcp", fmt.Sprintf(":%d", s.port))
	if err != nil {
		return fmt.Errorf("listen on :%d: %w", s.port, err)
	}

	s.logger.Info("gRPC server starting", zap.Int("port", s.port))
	return s.server.Serve(lis)
}

func (s *GRPCServer) Stop() {
	s.server.GracefulStop()
}

func grpcRecoveryInterceptor(logger *zap.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		defer func() {
			if r := recover(); r != nil {
				logger.Error("gRPC panic recovered", zap.Any("panic", r), zap.String("method", info.FullMethod))
			}
		}()
		return handler(ctx, req)
	}
}

func grpcLoggingInterceptor(logger *zap.Logger) grpc.UnaryServerInterceptor {
	return func(ctx context.Context, req interface{}, info *grpc.UnaryServerInfo, handler grpc.UnaryHandler) (interface{}, error) {
		logger.Debug("gRPC call", zap.String("method", info.FullMethod))
		resp, err := handler(ctx, req)
		if err != nil {
			st, _ := status.FromError(err)
			logger.Warn("gRPC error", zap.String("method", info.FullMethod), zap.String("code", st.Code().String()), zap.Error(err))
		}
		return resp, err
	}
}
