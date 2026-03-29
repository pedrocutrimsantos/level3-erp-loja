# ── Stage 1: build ──────────────────────────────────────────────────────────
FROM gradle:8.5-jdk17 AS build
WORKDIR /app

# Copia apenas os arquivos de dependências primeiro (cache layer)
COPY build.gradle.kts settings.gradle.kts ./
COPY gradle/ gradle/
RUN gradle dependencies --no-daemon || true

# Copia o restante e gera a distribuição
COPY src/ src/
RUN gradle installDist --no-daemon

# ── Stage 2: runtime ─────────────────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app
COPY --from=build /app/build/install/level3-loja-madeira /app
EXPOSE 8080
CMD ["/app/bin/level3-loja-madeira"]
