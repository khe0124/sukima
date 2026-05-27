import { getCollections } from "@/server/collections";
import { getTags } from "@/server/tags";

import UploadPageClient from "./UploadPageClient";

export const dynamic = "force-dynamic";

export default async function UploadPage() {
  const [collections, tags] = await Promise.all([getCollections(), getTags()]);

  return <UploadPageClient collections={collections} tags={tags} />;
}
