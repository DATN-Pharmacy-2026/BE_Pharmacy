import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { CreateProductImageDto } from './create-product-image.dto';

describe('CreateProductImageDto', () => {
  it('accepts an uploaded image URL served from localhost', async () => {
    const dto = plainToInstance(CreateProductImageDto, {
      url: 'http://localhost:3000/api/uploads/product-images/example.jpg',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.url).toBe('/api/uploads/product-images/example.jpg');
  });

  it('accepts an existing relative upload URL', async () => {
    const dto = plainToInstance(CreateProductImageDto, {
      url: '/api/uploads/product-images/example.jpg',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('keeps external URLs unchanged', async () => {
    const dto = plainToInstance(CreateProductImageDto, {
      url: 'https://cdn.example.com/product-images/example.jpg',
    });

    await expect(validate(dto)).resolves.toHaveLength(0);
    expect(dto.url).toBe('https://cdn.example.com/product-images/example.jpg');
  });

  it('rejects values that are not HTTP URLs', async () => {
    const dto = plainToInstance(CreateProductImageDto, {
      url: 'not-a-url',
    });

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
