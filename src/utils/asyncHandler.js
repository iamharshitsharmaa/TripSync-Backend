// Wrap any async controller — catches errors automatically
const asyncHandler = (fn) => {
  return function (req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
export default asyncHandler