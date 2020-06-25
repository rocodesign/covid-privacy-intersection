export function genToken() {
  return (
    Math.random().toString(16).substr(2) + Math.random().toString(16).substr(2)
  ) // remove `0.`
}
