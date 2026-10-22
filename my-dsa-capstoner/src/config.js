const rawPort = process.env.PORT;
const port = rawPort === undefined ? 3000 : Number(rawPort);

if (!Number.isInteger(port) || port < 0 || port > 65535) {
  throw new RangeError('PORT must be an integer between 0 and 65535');
}

export const config = Object.freeze({ port });
