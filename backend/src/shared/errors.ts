/** Erro base da aplicação — carrega o status HTTP e um código de negócio. */
export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 400,
    public readonly code: string = 'BAD_REQUEST',
  ) {
    super(message);
    this.name = new.target.name;
  }
}

/** Violação de regra de negócio (ex.: dados inválidos). */
export class BusinessError extends AppError {
  constructor(message: string, code = 'BUSINESS_RULE') {
    super(message, 422, code);
  }
}

/** Conflito — ex.: documento (CPF/CNPJ) já cadastrado. */
export class ConflictError extends AppError {
  constructor(message: string, code = 'CONFLICT') {
    super(message, 409, code);
  }
}

/** Recurso não encontrado. */
export class NotFoundError extends AppError {
  constructor(message = 'Recurso não encontrado', code = 'NOT_FOUND') {
    super(message, 404, code);
  }
}
