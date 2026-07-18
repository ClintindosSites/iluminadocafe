import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConsumptionMethod } from "@prisma/client";
import Image from "next/image";
import Link from "next/link";
interface ConsumptionMethorOptionProps {
  imageUrl: string;
  imageAlt: string;
  buttonText: string;
  option: ConsumptionMethod;
  slug: string;
}

const ConsumptionMethodOption = ({
  imageAlt,
  imageUrl,
  buttonText,
  option,
  slug,
}: ConsumptionMethorOptionProps) => {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-8 py-8">
        {" "}
        <div className="relative h-[80px] w-[80px]">
          <Image src={imageUrl} fill alt={imageAlt} />
        </div>
        <Button
          variant={"secondary"}
          className="rounded-full bg-red-700 text-white"
          asChild
        >
          <Link href={`${slug}/menu?consumptionMethod=${option}`}>
            {buttonText}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
};

export default ConsumptionMethodOption;
