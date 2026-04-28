// Fastify plugin type augmentations for @fastify/jwt, @fastify/cookie, @fastify/multipart.
// export {} makes this a module, so declare module 'fastify' augments instead of replacing.

import type { Readable } from 'stream'

export {}

declare module 'fastify' {
  interface MultipartFile {
    fieldname: string
    filename: string
    encoding: string
    mimetype: string
    file: Readable
  }

  interface FastifyRequest {
    user: {
      userId: string
      psuPassportId: string
      role: string
      facultyId: string | null
      [key: string]: unknown
    }
    jwtVerify<Decoded extends object = object>(options?: object): Promise<Decoded>
    cookies: { [cookieName: string]: string | undefined }
    file(): Promise<MultipartFile | undefined>
  }
  interface FastifyReply {
    setCookie(name: string, value: string, options?: object): this
    clearCookie(name: string, options?: object): this
    cookies: { [cookieName: string]: string | undefined }
  }
  interface FastifyInstance {
    jwt: {
      sign(payload: object, options?: object): string
      verify<Decoded extends object = object>(token: string, options?: object): Decoded
      decode<Decoded extends object = object>(token: string, options?: object): Decoded | null
    }
  }
}
