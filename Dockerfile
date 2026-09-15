# Stage 1: Build da aplicação Vue 3 / Vite
FROM node:22-alpine AS builder

WORKDIR /app

# Copiar arquivos de dependências
COPY package.json package-lock.json ./

# Instalar dependências
RUN npm ci --legacy-peer-deps

# Copiar código fonte
COPY . .

# Variável de ambiente de build para o Vite (padrão /api utiliza o proxy reverso)
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL

# Executar compilação de produção
RUN npm run build

# Stage 2: Servidor Nginx ultra-leve
FROM nginx:alpine

# Copiar template de configuração com envsubst automático
COPY docker/nginx.conf.template /etc/nginx/templates/default.conf.template

# Copiar arquivos gerados no build para a pasta padrão do Nginx
COPY --from=builder /app/dist /usr/share/nginx/html

# Variáveis padrão para resolução interna no Docker/Portainer
ENV BACKEND_HOST=capihouse-api
ENV BACKEND_PORT=8000
ENV PORT=80

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
