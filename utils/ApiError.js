class ApiError extends Error {
    constructor(status, code, message, details = null) {
      super(message);
      this.name = 'ApiError';
      this.status = status;
      this.code = code;
      this.details = details;
    }
  }
  
  function badRequest(code, message, details = null) {
    return new ApiError(400, code, message, details);
  }
  function forbidden(code, message, details = null) {
    return new ApiError(403, code, message, details);
  }
  function notFound(code, message, details = null) {
    return new ApiError(404, code, message, details);
  }
  function conflict(code, message, details = null) {
    return new ApiError(409, code, message, details);
  }
  
  module.exports = {
    ApiError,
    badRequest,
    forbidden,
    notFound,
    conflict,
  };
  