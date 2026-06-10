import { Injectable } from '@nestjs/common';
import { SafetyCheckResult } from './safety.types';

@Injectable()
export class SafetyService {
  private readonly rules: Array<{ name: string; pattern: RegExp }> = [
    {
      name: 'diagnosis_request',
      pattern: /\b(chẩn đoán|chan doan|bị bệnh gì|benh gi|xác định bệnh)\b/i,
    },
    {
      name: 'prescription_dose',
      pattern:
        /\b(liều dùng|lieu dung|uống bao nhiêu|uong bao nhieu|kê đơn|ke don)\b/i,
    },
    {
      name: 'replace_doctor_prescription',
      pattern:
        /\b(thay thế đơn thuốc|thay the don thuoc|đổi thuốc bác sĩ kê)\b/i,
    },
    {
      name: 'multi_drug_interaction',
      pattern:
        /\b(phối hợp thuốc|phoi hop thuoc|uống cùng|uong cung|tương tác thuốc|tuong tac thuoc)\b/i,
    },
    {
      name: 'pregnancy_breastfeeding',
      pattern: /\b(mang thai|cho con bú|cho con bu|thai kỳ|thai ky)\b/i,
    },
    {
      name: 'children_elderly',
      pattern:
        /\b(trẻ em|tre em|em bé|so sinh|người cao tuổi|nguoi cao tuoi)\b/i,
    },
    {
      name: 'chronic_disease',
      pattern:
        /\b(bệnh nền|benh nen|gan|thận|than|tim mạch|tim mach|tiểu đường|tieu duong|huyết áp|huyet ap)\b/i,
    },
    {
      name: 'danger_symptoms',
      pattern:
        /\b(khó thở|kho tho|đau ngực|dau nguc|co giật|co giat|sốt cao kéo dài|sot cao keo dai)\b/i,
    },
  ];

  checkSafety(message: string): SafetyCheckResult {
    const text = (message || '').trim();
    const matchedRules = this.rules
      .filter((r) => r.pattern.test(text))
      .map((r) => r.name);

    if (matchedRules.length > 0) {
      return {
        handoffRequired: true,
        reason: 'MEDICAL_SAFETY',
        matchedRules,
      };
    }

    return {
      handoffRequired: false,
      matchedRules: [],
    };
  }
}
