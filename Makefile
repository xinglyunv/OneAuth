.PHONY: proto ent run test lint

proto:
	protoc --proto_path=proto --go_out=. --go_opt=module=github.com/identity-platform \
		--go-grpc_out=. --go-grpc_opt=module=github.com/identity-platform \
		proto/auth/auth.proto proto/oauth2/oauth2.proto proto/user/user.proto

ent:
	go generate ./internal/ent

run:
	go run ./cmd/server

test:
	go test ./...

lint:
	golangci-lint run ./...

build:
	go build -o bin/server ./cmd/server
