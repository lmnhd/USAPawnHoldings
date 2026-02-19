import { redirect } from 'next/navigation';

export default function AppraisePage() {
  redirect('/?heroMode=appraisal&heroOpen=1');
}
