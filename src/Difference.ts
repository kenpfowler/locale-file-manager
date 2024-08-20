/**
 * kind - indicates the kind of change; will be one of the following:
 *
 * N - indicates a newly added property/element
 *
 * D - indicates a property/element was deleted
 *
 * E - indicates a property/element was edited
 *
 * A - indicates a change occurred within an array
 *
 * https://www.npmjs.com/package/deep-diff
 */
export enum Difference {
  New = "N",
  Deleted = "D",
  Edited = "E",
  InArray = "A",
}
