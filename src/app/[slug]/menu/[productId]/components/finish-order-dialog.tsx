"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { ConsumptionMethod, OrderPaymentMethod } from "@prisma/client";
import { Loader2Icon } from "lucide-react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useContext, useState } from "react";
import { useForm } from "react-hook-form";
import { PatternFormat } from "react-number-format";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

import { createMercadoPagoCheckout } from "../../actions/create-mercado-pago-checkout";
import { createOrder } from "../../actions/create-order";
import { CartContext } from "../../contexts/cart";
import { isValidCpf, removeCpfPunctuation } from "../../helpers/cpf";

const formSchema = z.object({
  name: z.string().trim().min(1, {
    message: "O nome é obrigatório",
  }),
  cpf: z
    .string()
    .trim()
    .min(1, {
      message: "O CPF é obrigatório",
    })
    .refine((value) => isValidCpf(value), {
      message: "CPF inválido",
    }),
});

type FormSchema = z.infer<typeof formSchema>;

interface FinishOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const FinishOrderDialog = ({ open, onOpenChange }: FinishOrderDialogProps) => {
  const { slug } = useParams<{ slug: string }>();
  const { products } = useContext(CartContext);
  const searchParams = useSearchParams();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);

  const [paymentMethod, setPaymentMethod] = useState<OrderPaymentMethod>("PIX");

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: "",
      cpf: "",
    },
    shouldUnregister: true,
  });

  const onSubmit = async (data: FormSchema) => {
    if (isLoading) return;

    try {
      setIsLoading(true);
      form.clearErrors("root");

      const consumptionMethodParam = searchParams.get("consumptionMethod");

      const validConsumptionMethods: ConsumptionMethod[] = [
        "DINE_IN",
        "TAKEAWAY",
        "SCHEDULE_ORDER",
      ];

      if (
        !consumptionMethodParam ||
        !validConsumptionMethods.includes(
          consumptionMethodParam as ConsumptionMethod,
        )
      ) {
        throw new Error("Método de consumo inválido.");
      }

      if (products.length === 0) {
        throw new Error("Seu carrinho está vazio.");
      }

      // Cria o pedido usando os preços do banco de dados.
      const order = await createOrder({
        consumptionMethod: consumptionMethodParam as ConsumptionMethod,
        customerCpf: removeCpfPunctuation(data.cpf),
        customerName: data.name,
        products,
        slug,
        paymentMethod,
      });

      // Dinheiro na entrega não precisa de checkout online.
      if (paymentMethod === "CASH_ON_DELIVERY") {
        onOpenChange(false);

        // Abre a página de pedidos existente.
        router.push(
          `/${slug}/orders?consumptionMethod=${encodeURIComponent(
            consumptionMethodParam,
          )}`,
        );

        return;
      }

      // Pix ou cartão: cria a preferência no Mercado Pago.
      const checkout = await createMercadoPagoCheckout({
        orderId: order.id,
        slug,
      });

      // Redireciona o cliente ao Checkout Pro.
      window.location.assign(checkout.checkoutUrl);
    } catch (error) {
      console.error("Erro ao finalizar pedido:", error);

      form.setError("root", {
        message:
          error instanceof Error
            ? error.message
            : "Não foi possível finalizar o pedido. Tente novamente.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader>
          <DrawerTitle>Finalizar pedido</DrawerTitle>
          <DrawerDescription>
            Informe seus dados e escolha como deseja pagar.
          </DrawerDescription>
        </DrawerHeader>

        <div className="p-5">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seu nome</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Digite seu nome..."
                        autoComplete="name"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cpf"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Seu CPF</FormLabel>
                    <FormControl>
                      <PatternFormat
                        placeholder="000.000.000-00"
                        format="###.###.###-##"
                        customInput={Input}
                        autoComplete="off"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-3">
                <p className="text-sm font-medium">Forma de pagamento</p>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="PIX"
                    checked={paymentMethod === "PIX"}
                    onChange={() => setPaymentMethod("PIX")}
                    disabled={isLoading}
                    className="accent-primary"
                  />
                  <span className="flex-1">
                    <span className="block font-medium">Pix</span>
                    <span className="text-sm text-muted-foreground">
                      Pague online pelo Mercado Pago.
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CARD"
                    checked={paymentMethod === "CARD"}
                    onChange={() => setPaymentMethod("CARD")}
                    disabled={isLoading}
                    className="accent-primary"
                  />
                  <span className="flex-1">
                    <span className="block font-medium">Cartão de crédito</span>
                    <span className="text-sm text-muted-foreground">
                      Pague online pelo Mercado Pago.
                    </span>
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-3 rounded-lg border p-3">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CASH_ON_DELIVERY"
                    checked={paymentMethod === "CASH_ON_DELIVERY"}
                    onChange={() => setPaymentMethod("CASH_ON_DELIVERY")}
                    disabled={isLoading}
                    className="accent-primary"
                  />
                  <span className="flex-1">
                    <span className="block font-medium">
                      Dinheiro na entrega
                    </span>
                    <span className="text-sm text-muted-foreground">
                      Pague ao receber o pedido.
                    </span>
                  </span>
                </label>
              </div>

              {form.formState.errors.root?.message && (
                <p role="alert" className="text-sm text-destructive">
                  {form.formState.errors.root.message}
                </p>
              )}

              <DrawerFooter className="px-0">
                <Button
                  type="submit"
                  variant="destructive"
                  className="w-full rounded-full text-white"
                  disabled={isLoading || products.length === 0}
                >
                  {isLoading && (
                    <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />
                  )}

                  {isLoading
                    ? "Processando..."
                    : paymentMethod === "CASH_ON_DELIVERY"
                      ? "Confirmar pedido"
                      : "Continuar para pagamento"}
                </Button>

                <DrawerClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full rounded-full"
                    disabled={isLoading}
                  >
                    Cancelar
                  </Button>
                </DrawerClose>
              </DrawerFooter>
            </form>
          </Form>
        </div>
      </DrawerContent>
    </Drawer>
  );
};

export default FinishOrderDialog;
