FROM node:22-alpine AS build
WORKDIR /workspace
COPY package.json package-lock.json ./
COPY apps/web/package.json apps/web/package.json
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm ci
COPY packages/shared packages/shared
COPY apps/web apps/web
ARG VITE_API_URL=http://localhost:4100
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build --workspace @pinpoint/shared \
    && npm run build --workspace @pinpoint/web

FROM node:22-alpine
WORKDIR /workspace
ENV NODE_ENV=production
COPY --from=build /workspace/package.json /workspace/package-lock.json ./
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/web/dist ./apps/web/dist
COPY --from=build /workspace/apps/web/package.json ./apps/web/package.json
EXPOSE 5173
CMD ["npm", "run", "preview", "--workspace", "@pinpoint/web", "--", "--host", "0.0.0.0"]
