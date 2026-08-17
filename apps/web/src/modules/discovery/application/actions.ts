"use server";

import { getFallbackDiscovery, getNearbyDiscovery } from "./getDiscoveryData";

/** Llamada directo desde un componente cliente (Geolocation API es browser-only) — no es un submit de formulario. */
export async function getNearbyDiscoveryAction(lat: number, lng: number) {
  return getNearbyDiscovery(lat, lng);
}

export async function getFallbackDiscoveryAction() {
  return getFallbackDiscovery();
}
