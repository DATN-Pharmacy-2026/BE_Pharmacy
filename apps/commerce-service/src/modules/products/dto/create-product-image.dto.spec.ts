import { validate } from 'class-validator';
import { CreateProductImageDto } from './create-product-image.dto';

describe('CreateProductImageDto', () => {
  it('accepts an uploaded image URL served from localhost', async () => {
    const dto = new CreateProductImageDto();
    dto.url = 'http://localhost:3000/api/uploads/product-images/example.jpg';

    await expect(validate(dto)).resolves.toHaveLength(0);
  });

  it('rejects values that are not HTTP URLs', async () => {
    const dto = new CreateProductImageDto();
    dto.url = 'not-a-url';

    await expect(validate(dto)).resolves.not.toHaveLength(0);
  });
});
