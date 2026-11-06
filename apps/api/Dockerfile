FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY packages/shared packages/shared
COPY apps/api apps/api
RUN npm run build --workspace @pinpoint/shared \
    && npm run prisma:generate --workspace @pinpoint/api \
    && npm run build --workspace @pinpoint/api

FROM node:22-alpine
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/package.json /workspace/package-lock.json ./
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/api ./apps/api
COPY --from=build /workspace/packages/shared ./packages/shared
CMD ["npm", "run", "start", "--workspace", "@pinpoint/api"]
