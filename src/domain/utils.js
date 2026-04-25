/**
 * 通用深拷贝函数（支持数组、对象、基本类型）
 * @param {any} obj
 * @returns {any}
 */
export function deepClone(obj) {
    if (obj === null || typeof obj !== 'object') return obj;

    if (Array.isArray(obj)) {
        const result = [];
        for (let i = 0; i < obj.length; i++) {
            result[i] = deepClone(obj[i]);
        }
        return result;
    }

    const result = {};
    for (const key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            result[key] = deepClone(obj[key]);
        }
    }
    return result;
}