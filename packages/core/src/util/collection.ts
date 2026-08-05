/**
 * A collection class that extends the built-in Map class, providing additional utility methods for managing key-value pairs.
 * @template K - The type of keys in the collection.
 * @template V - The type of values in the collection.
 * @public
 */
export class Collection<K, V> extends Map<K, V> {
    /**
     * Retrieves the first value in the collection that satisfies the provided predicate function.
     * @param predicate - A function that tests each value in the collection.
     * @returns The first value that satisfies the predicate, or undefined if none do.
     */
    public find(predicate: (value: V, key: K) => boolean): V | undefined {
        for (const [key, value] of this) {
            if (predicate(value, key)) {
                return value;
            }
        }
        return undefined;
    }

    /**
     * Filters the collection based on a provided predicate function, returning a new collection containing only the entries that satisfy the predicate.
     * @param predicate - A function that tests each value in the collection.
     * @returns A new Collection instance containing only the entries that satisfy the predicate.
     */
    public filter(predicate: (value: V, key: K) => boolean): Collection<K, V> {
        const filtered = new Collection<K, V>();
        for (const [key, value] of this) {
            if (predicate(value, key)) {
                filtered.set(key, value);
            }
        }
        return filtered;
    }

    /**
     * Returns the first value in the collection, or undefined if the collection is empty.
     * @returns The first value, if any.
     */
    public first(): V | undefined {
        return this.values().next().value;
    }

    /**
     * Returns the last value in the collection, or undefined if the collection is empty.
     * @returns The last value, if any.
     */
    public last(): V | undefined {
        let lastValue: V | undefined;
        for (const value of this.values()) lastValue = value;
        return lastValue;
    }

    /**
     * Returns the value at the given index (supports negative indices from the end), or undefined if out of bounds.
     * @param index - The index of the value.
     * @returns The value at the index, if any.
     */
    public at(index: number): V | undefined {
        const entries = Array.from(this.values());
        if (index < 0) index = entries.length + index;
        return entries[index];
    }

    /**
     * Returns whether any value in the collection satisfies the predicate.
     * @param predicate - A function that tests each value in the collection.
     * @returns True if at least one value satisfies the predicate.
     */
    public some(predicate: (value: V, key: K) => boolean): boolean {
        for (const [key, value] of this) {
            if (predicate(value, key)) return true;
        }
        return false;
    }

    /**
     * Returns whether every value in the collection satisfies the predicate.
     * @param predicate - A function that tests each value in the collection.
     * @returns True if every value satisfies the predicate, or the collection is empty.
     */
    public every(predicate: (value: V, key: K) => boolean): boolean {
        for (const [key, value] of this) {
            if (!predicate(value, key)) return false;
        }
        return true;
    }

    /**
     * Returns the first key in the collection whose value satisfies the predicate.
     * @param predicate - A function that tests each value in the collection.
     * @returns The first matching key, if any.
     */
    public findKey(predicate: (value: V, key: K) => boolean): K | undefined {
        for (const [key, value] of this) {
            if (predicate(value, key)) return key;
        }
        return undefined;
    }
}