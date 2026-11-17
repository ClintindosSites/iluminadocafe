"use client";

import { useEffect, useState } from "react";

interface DeliveryRange {
  id?: string;
  minDistanceKm: number;
  maxDistanceKm: number;
  fee: number;
}

interface DeliverySettings {
  deliveryEnabled: boolean;
  deliveryAddress: string;
  deliveryMaxDistanceKm: number;
  ranges: DeliveryRange[];
}

const initialSettings: DeliverySettings = {
  deliveryEnabled: false,
  deliveryAddress:
    "Rua Flor de Alecrim, 98, Pindorama, Belo Horizonte - MG, CEP 30865-350",
  deliveryMaxDistanceKm: 7,
  ranges: [
    { minDistanceKm: 0, maxDistanceKm: 2, fee: 5 },
    { minDistanceKm: 2, maxDistanceKm: 4, fee: 7 },
    { minDistanceKm: 4, maxDistanceKm: 7, fee: 10 },
  ],
};

export default function EntregasPage() {
  const [settings, setSettings] = useState<DeliverySettings>(initialSettings);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch("/api/admin/entregas");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Erro ao carregar configurações.");
        }

        setSettings(data.settings);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Erro ao carregar dados.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  function updateRange(
    index: number,
    field: keyof DeliveryRange,
    value: number,
  ) {
    setSettings((current) => ({
      ...current,
      ranges: current.ranges.map((range, i) =>
        i === index ? { ...range, [field]: value } : range,
      ),
    }));
  }

  function addRange() {
    setSettings((current) => {
      const last = current.ranges[current.ranges.length - 1];

      const minDistanceKm = last ? last.maxDistanceKm : 0;

      return {
        ...current,
        ranges: [
          ...current.ranges,
          {
            minDistanceKm,
            maxDistanceKm: Math.min(
              minDistanceKm + 1,
              current.deliveryMaxDistanceKm,
            ),
            fee: 0,
          },
        ],
      };
    });
  }

  function removeRange(index: number) {
    setSettings((current) => ({
      ...current,
      ranges: current.ranges.filter((_, i) => i !== index),
    }));
  }

  async function saveSettings() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/admin/entregas", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(settings),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Não foi possível salvar.");
      }

      setSettings({
        ...settings,
        ranges: data.settings.deliveryFeeRanges,
      });

      setMessage("Configurações de entrega salvas com sucesso!");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Erro ao salvar configurações.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="py-12 text-center text-gray-500">
        Carregando configurações de entrega...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Taxas de entrega</h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure as regiões atendidas e os valores cobrados dos clientes.
        </p>
      </div>

      {message && (
        <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
          {message}
        </div>
      )}

      {error && (
        <div className="rounded-lg bg-red-50 p-4 text-sm text-red-700">
          {error}
        </div>
      )}

      <section className="space-y-5 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-900">
              Entregas pelo motoboy
            </h2>
            <p className="text-sm text-gray-500">
              Ative ou desative a modalidade de entrega.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setSettings((current) => ({
                ...current,
                deliveryEnabled: !current.deliveryEnabled,
              }))
            }
            className={`rounded-full px-4 py-2 text-sm font-semibold ${
              settings.deliveryEnabled
                ? "bg-green-100 text-green-700"
                : "bg-gray-100 text-gray-600"
            }`}
          >
            {settings.deliveryEnabled ? "Ativado" : "Desativado"}
          </button>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Endereço de origem do restaurante
          </label>

          <input
            value={settings.deliveryAddress}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                deliveryAddress: event.target.value,
              }))
            }
            maxLength={300}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-amber-500"
            placeholder="Rua, número, bairro, cidade e CEP"
          />

          <p className="mt-2 text-xs text-gray-500">
            Este endereço será utilizado como ponto inicial das rotas.
          </p>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-gray-700">
            Distância máxima de atendimento (km)
          </label>

          <input
            type="number"
            min="0.1"
            max="100"
            step="0.1"
            value={settings.deliveryMaxDistanceKm}
            onChange={(event) =>
              setSettings((current) => ({
                ...current,
                deliveryMaxDistanceKm: Number(event.target.value),
              }))
            }
            className="w-full max-w-xs rounded-lg border border-gray-300 px-4 py-3 text-sm outline-none focus:border-amber-500"
          />
        </div>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-semibold text-gray-900">
              Faixas de quilometragem
            </h2>
            <p className="text-sm text-gray-500">
              Defina quanto será cobrado em cada distância.
            </p>
          </div>

          <button
            type="button"
            onClick={addRange}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-700"
          >
            + Adicionar faixa
          </button>
        </div>

        <div className="space-y-4">
          {settings.ranges.map((range, index) => (
            <div
              key={range.id ?? index}
              className="grid grid-cols-1 gap-3 rounded-lg border border-gray-200 p-4 sm:grid-cols-4"
            >
              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Distância inicial (km)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.1"
                  value={range.minDistanceKm}
                  onChange={(event) =>
                    updateRange(
                      index,
                      "minDistanceKm",
                      Number(event.target.value),
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Distância final (km)
                </label>
                <input
                  type="number"
                  min="0.1"
                  step="0.1"
                  value={range.maxDistanceKm}
                  onChange={(event) =>
                    updateRange(
                      index,
                      "maxDistanceKm",
                      Number(event.target.value),
                    )
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div>
                <label className="mb-1 block text-xs text-gray-500">
                  Taxa de entrega (R$)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={range.fee}
                  onChange={(event) =>
                    updateRange(index, "fee", Number(event.target.value))
                  }
                  className="w-full rounded-lg border border-gray-300 px-3 py-2"
                />
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => removeRange(index)}
                  className="w-full rounded-lg border border-red-200 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50"
                >
                  Remover faixa
                </button>
              </div>
            </div>
          ))}

          {settings.ranges.length === 0 && (
            <p className="rounded-lg bg-gray-50 p-5 text-center text-sm text-gray-500">
              Nenhuma faixa cadastrada.
            </p>
          )}
        </div>
      </section>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={saveSettings}
          disabled={saving}
          className="rounded-lg bg-amber-600 px-6 py-3 font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
        >
          {saving ? "Salvando..." : "Salvar configurações"}
        </button>
      </div>
    </div>
  );
}
