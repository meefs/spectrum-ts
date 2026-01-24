export class Store {
    private store: Map<string, any> = new Map();
    
    save<T>(key: string, value: T) {
        this.store.set(key, value);
    }
    
    get<T>(key: string): T {
        return this.store.get(key);
    }
}
