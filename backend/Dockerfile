FROM golang:1.23-alpine AS builder

WORKDIR /app

COPY go.mod go.sum* ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

# Distroless static уже содержит ca-certificates и /etc/passwd с nobody,
# плюс не зависит от alpine APK mirror'а.
FROM gcr.io/distroless/static-debian12:nonroot

WORKDIR /app

COPY --from=builder /server /app/server
COPY --from=builder /app/migrations /app/migrations

EXPOSE 8080

USER nonroot:nonroot
CMD ["/app/server"]
