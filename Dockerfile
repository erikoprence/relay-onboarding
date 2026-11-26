FROM node:24-bookworm-slim
ENV NODE_ENV=production HOST=0.0.0.0 PORT=4173 RELAY_DATA_DIR=/data
WORKDIR /opt/relay
COPY package.json ./
COPY src ./src
COPY web ./web
COPY database/001-schema.sql ./database/001-schema.sql
COPY scripts ./scripts
RUN mkdir -p /data && chown node:node /data
USER node
EXPOSE 4173
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s CMD node -e "fetch('http://127.0.0.1:'+process.env.PORT+'/healthz').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node","src/server.mjs"]
