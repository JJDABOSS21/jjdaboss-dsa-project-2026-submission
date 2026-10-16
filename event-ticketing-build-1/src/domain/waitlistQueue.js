// Linked-list queue: enqueue, dequeue and peek are O(1).
export class Queue {
  #head = null;
  #tail = null;
  #size = 0;

  enqueue(value) {
    const node = { value, next: null };
    if (this.#tail) this.#tail.next = node;
    else this.#head = node;
    this.#tail = node;
    this.#size += 1;
    return this.#size;
  }

  dequeue() {
    if (!this.#head) return undefined;
    const value = this.#head.value;
    this.#head = this.#head.next;
    this.#size -= 1;
    if (!this.#head) this.#tail = null;
    return value;
  }

  peek() {
    return this.#head?.value;
  }

  get size() {
    return this.#size;
  }

  isEmpty() {
    return this.#size === 0;
  }
}
