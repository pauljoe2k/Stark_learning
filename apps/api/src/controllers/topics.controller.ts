import type { NextFunction, Request, Response } from 'express';
import {
  cloudinaryFinalizeSchema,
  createTopicBodySchema,
  localUploadTicketSchema,
  positiveIdSchema,
  uploadTicketRequestSchema,
  updateTopicBodySchema,
} from '@pinpoint/shared';
import { HttpError } from '../errors.js';
import type { TopicsService } from '../services/topics.service.js';
import type { UploadTicketQuota } from '../services/upload-tickets.js';

function userIdFrom(request: Request): number {
  if (!request.user) throw new HttpError(401, 'Authentication is required.', 'AUTH_REQUIRED');
  return request.user.id;
}

function topicIdFrom(request: Request): number {
  const parsed = positiveIdSchema.safeParse(request.params.id);
  if (!parsed.success) throw new HttpError(400, 'Topic id must be a positive integer.', 'INVALID_TOPIC_ID');
  return parsed.data;
}

function fileIdFrom(request: Request): number {
  const parsed = positiveIdSchema.safeParse(request.params.fileId);
  if (!parsed.success) throw new HttpError(400, 'File id must be a positive integer.', 'INVALID_FILE_ID');
  return parsed.data;
}

export function createTopicsController(service: TopicsService, quota: UploadTicketQuota) {
  return {
    list: async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.status(200).json({ topics: await service.listTopics(userIdFrom(req)) });
      } catch (error) { next(error); }
    },
    get: async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.status(200).json({ topic: await service.getTopic(userIdFrom(req), topicIdFrom(req)) });
      } catch (error) { next(error); }
    },
    create: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = createTopicBodySchema.safeParse(req.body);
        if (!input.success) throw new HttpError(400, input.error.issues[0]?.message ?? 'Invalid topic details.');
        const { unitId, ...topicInput } = input.data;
        res.status(201).json({
          topic: await service.createTopic(userIdFrom(req), {
            ...topicInput,
            ...(unitId !== undefined ? { unitId } : {}),
          }),
        });
      } catch (error) { next(error); }
    },
    update: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = updateTopicBodySchema.safeParse(req.body);
        if (!input.success) throw new HttpError(400, input.error.issues[0]?.message ?? 'Invalid topic details.');
        const data = input.data;
        res.status(200).json({
          topic: await service.updateTopic(userIdFrom(req), topicIdFrom(req), {
            ...(data.title !== undefined ? { title: data.title } : {}),
            ...(data.notes !== undefined ? { notes: data.notes } : {}),
            ...(data.keyPoints !== undefined
              ? { keyPoints: data.keyPoints.map(({ id, text }) => id === undefined ? { text } : { id, text }) }
              : {}),
          }),
        });
      } catch (error) { next(error); }
    },
    ticket: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const request = uploadTicketRequestSchema.safeParse(req.body);
        if (!request.success) throw new HttpError(400, 'Upload-ticket requests must not contain fields.', 'INVALID_UPLOAD_TICKET_REQUEST');
        const id = topicIdFrom(req);
        if (!(await quota.consume(userIdFrom(req)))) {
          throw new HttpError(429, 'Upload limit reached. Wait a minute before trying again.', 'UPLOAD_RATE_LIMIT');
        }
        res.status(201).json(await service.createUploadTicket(userIdFrom(req), id));
      } catch (error) { next(error); }
    },
    localUpload: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const ticket = localUploadTicketSchema.safeParse(req.body);
        if (!ticket.success) throw new HttpError(400, 'A valid uploadToken is required.', 'INVALID_UPLOAD_TICKET');
        if (!req.file) throw new HttpError(400, 'Choose a PDF or image to upload.', 'FILE_REQUIRED');
        const result = await service.acceptLocalUpload(userIdFrom(req), topicIdFrom(req), ticket.data.uploadToken, {
          buffer: req.file.buffer,
          mimetype: req.file.mimetype,
        });
        res.status(202).json(result);
      } catch (error) { next(error); }
    },
    cloudinaryFinalize: async (req: Request, res: Response, next: NextFunction) => {
      try {
        const input = cloudinaryFinalizeSchema.safeParse(req.body);
        if (!input.success) throw new HttpError(400, input.error.issues[0]?.message ?? 'Invalid Cloudinary upload.');
        const result = await service.acceptCloudinaryUpload(userIdFrom(req), topicIdFrom(req), input.data);
        res.status(202).json(result);
      } catch (error) { next(error); }
    },
    fileStatus: async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.status(200).json(await service.getFileStatus(userIdFrom(req), topicIdFrom(req), fileIdFrom(req)));
      } catch (error) { next(error); }
    },
  };
}
