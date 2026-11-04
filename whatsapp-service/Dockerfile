# Build stage
FROM golang:1.25-alpine AS builder

RUN apk add --no-cache gcc musl-dev sqlite-dev

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=1 GOOS=linux go build -trimpath -ldflags="-s -w" -o whatsapp-service ./cmd/server

# Runtime stage
FROM alpine:3.19

RUN apk add --no-cache ca-certificates sqlite-libs
RUN addgroup -S imobzy && adduser -S -G imobzy imobzy

WORKDIR /app

COPY --from=builder /app/whatsapp-service .

RUN mkdir -p .sessions && chown -R imobzy:imobzy /app

USER imobzy

EXPOSE 3100

CMD ["./whatsapp-service"]
