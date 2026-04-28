// Fastify plugin type augmentations for @fastify/jwt and @fastify/cookie.
// export {} makes this a module, so declare module 'fastify' augments instead of replacing.

export {}

declare module 'fastify' {
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
