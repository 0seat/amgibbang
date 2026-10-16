import Link from "next/link";
import { Page } from "@/components/header";
import { Uploader } from "@/components/uploader";

export default function NewSetPage() {
  return (
    <Page>
      <Link href="/" className="text-sm text-stone-500 hover:text-stone-800">
        ← 내 세트
      </Link>
      <h1 className="mt-2 mb-5 text-xl font-bold">새 문제 세트</h1>
      <Uploader mode="create" />
    </Page>
  );
}
