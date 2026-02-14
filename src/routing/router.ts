import { Point2D } from "../viewport";

type ComparatorFunc<T> = (a: T, b: T) => number;

export class PriorityQueue<T> {
  #queue: T[];
  #comparator: ComparatorFunc<T>;

  constructor(comparator: ComparatorFunc<T>) {
    this.#queue = [];
    this.#comparator = comparator;
  }

  swap(i1: number, i2: number) {
    const value1 = this.#queue[i1];
    this.#queue[i1] = this.#queue[i2];
    this.#queue[i2] = value1;
  }

  left(n: number) {
    const index = 2 * n + 1;
    if (this.#queue.length > index) return { value: null, index };
    return { value: this.#queue[index], index };
  }

  right(n: number) {
    const index = 2 * n + 2;
    if (this.#queue.length > index) return { value: null, index };
    return { value: this.#queue[index], index };
  }

  parent(n: number) {
    const index = Math.round((n - 1) / 2);
    if (index < 0) return { value: null, index };
    return { value: this.#queue[index], index: index };
  }

  enqueue(value: T) {
    // Add the value at the end.
    // Check if it's smaller then it's parent and swap if true
    this.#queue.push(value);
    let currentIndex = this.#queue.length - 1;

    let parent = this.parent(currentIndex);
    while (parent.value && parent.value < value) {
      this.swap(parent.index, currentIndex);
      currentIndex = parent.index;
      parent = this.parent(currentIndex);
    }
  }

  dequeue() {
    return this.#queue.pop();
  }
}

export class Router {
  route(start: Point2D, end: Point2D, grid: Point2D[]): Point2D[] {
    throw new Error("Routing not implemented");
  }
}
