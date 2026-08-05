/**
 * Recursively converts all object keys in a JSON payload from camelCase to PascalCase.
 * @param obj - The raw JSON payload or array.
 * @returns The converted object with PascalCase keys.
 * @public
 */
export function convertToPascalCase(obj: any): any {
    if (typeof obj !== 'object' || obj === null) {
        return obj;
    }

    if (Array.isArray(obj)) {
        return obj.map((item) => convertToPascalCase(item));
    }

    const newObj: Record<string, any> = {};

    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            const pascalKey = key.charAt(0).toUpperCase() + key.slice(1);

            newObj[pascalKey] = convertToPascalCase(obj[key]);
        }
    }

    return newObj;
}
