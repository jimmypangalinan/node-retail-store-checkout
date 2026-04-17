import { InMemoryCheckoutRepository } from './InMemoryCheckoutRepository';

describe('InMemoryCheckoutRepository', () => {
  let repo: InMemoryCheckoutRepository;

  beforeEach(() => {
    repo = new InMemoryCheckoutRepository();
  });

  describe('get', () => {
    it('should return null for a key that does not exist', async () => {
      const result = await repo.get('missing');
      expect(result).toBeNull();
    });

    it('should return the stored value for an existing key', async () => {
      await repo.set('cust1', '{"items":[]}');
      const result = await repo.get('cust1');
      expect(result).toBe('{"items":[]}');
    });
  });

  describe('set', () => {
    it('should store a value and return it', async () => {
      const value = '{"subtotal":100}';
      const returned = await repo.set('cust2', value);
      expect(returned).toBe(value);
    });

    it('should overwrite an existing value for the same key', async () => {
      await repo.set('cust3', 'first');
      await repo.set('cust3', 'second');
      const result = await repo.get('cust3');
      expect(result).toBe('second');
    });
  });

  describe('remove', () => {
    it('should remove a stored key', async () => {
      await repo.set('cust4', 'data');
      await repo.remove('cust4');
      const result = await repo.get('cust4');
      expect(result).toBeNull();
    });

    it('should not throw when removing a key that does not exist', async () => {
      await expect(repo.remove('nonexistent')).resolves.not.toThrow();
    });
  });
});
