import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { access, mkdir, writeFile } from 'fs/promises';
import { join, resolve } from 'path';
import { UploadProductImageDto } from './dto/upload-product-image.dto';
import { toRelativeUploadUrl } from './upload-url.util';

const MAX_IMAGE_SIZE = 5 * 1024 * 1024;
const EXTENSIONS: Record<UploadProductImageDto['mimeType'], string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class UploadsService {
  private readonly productImagesDirectory = resolve(
    process.cwd(),
    'uploads',
    'product-images',
  );

  async uploadProductImage(dto: UploadProductImageDto) {
    const base64 = dto.data.includes(',')
      ? (dto.data.split(',').pop() ?? '')
      : dto.data;
    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64, 'base64');
    } catch {
      throw new BadRequestException('Invalid image data');
    }
    if (!buffer.length || buffer.length > MAX_IMAGE_SIZE) {
      throw new BadRequestException('Image must be smaller than 5 MB');
    }

    await mkdir(this.productImagesDirectory, { recursive: true });
    const filename = `${randomUUID()}.${EXTENSIONS[dto.mimeType]}`;
    await writeFile(join(this.productImagesDirectory, filename), buffer);

    return {
      fileName: dto.fileName,
      mimeType: dto.mimeType,
      size: buffer.length,
      url: toRelativeUploadUrl(`/api/uploads/product-images/${filename}`),
    };
  }

  async resolveProductImage(filename: string) {
    if (!/^[a-f0-9-]+\.(jpg|png|webp)$/i.test(filename)) {
      throw new NotFoundException('Image not found');
    }
    const filePath = join(this.productImagesDirectory, filename);
    try {
      await access(filePath);
    } catch {
      throw new NotFoundException('Image not found');
    }
    return filePath;
  }
}
