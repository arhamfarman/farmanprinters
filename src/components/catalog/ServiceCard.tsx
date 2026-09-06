import Link from "next/link";
import * as Icons from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ProductCategory } from "@prisma/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/** One tile on the public catalog grid, linking into its own /catalog/[slug] page. */
export function ServiceCard({ category }: { category: ProductCategory }) {
  const Icon = (category.iconName && (Icons as unknown as Record<string, LucideIcon>)[category.iconName]) || Icons.Printer;

  return (
    <Link href={`/catalog/${category.slug}`}>
      <Card className="h-full transition-shadow hover:shadow-md">
        <CardHeader className="flex-row items-center gap-2">
          <Icon className="h-5 w-5 text-primary" />
          <CardTitle className="text-foreground">{category.name}</CardTitle>
        </CardHeader>
        {category.description && <CardContent className="text-sm text-muted-foreground">{category.description}</CardContent>}
      </Card>
    </Link>
  );
}
