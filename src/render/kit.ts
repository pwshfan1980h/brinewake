import * as T from "three";
export const mats = {
  cream: new T.MeshStandardMaterial({
    color: 0xe7dcc2,
    roughness: 0.48,
    metalness: 0.4,
  }),
  orange: new T.MeshStandardMaterial({
    color: 0xef7946,
    roughness: 0.4,
    metalness: 0.5,
  }),
  dark: new T.MeshStandardMaterial({
    color: 0x143741,
    roughness: 0.65,
    metalness: 0.6,
  }),
  steel: new T.MeshStandardMaterial({
    color: 0x39717a,
    roughness: 0.5,
    metalness: 0.7,
  }),
  copper: new T.MeshStandardMaterial({
    color: 0x92745c,
    roughness: 0.6,
    metalness: 0.6,
  }),
  black: new T.MeshStandardMaterial({ color: 0x10252c, roughness: 0.7 }),
  cyan: new T.MeshStandardMaterial({
    color: 0x8affef,
    emissive: 0x4beed4,
    emissiveIntensity: 1.4,
  }),
  gold: new T.MeshStandardMaterial({
    color: 0xffd589,
    emissive: 0xffae46,
    emissiveIntensity: 1.1,
  }),
  red: new T.MeshStandardMaterial({
    color: 0xee727b,
    emissive: 0xe04c68,
    emissiveIntensity: 0.8,
  }),
  green: new T.MeshStandardMaterial({ color: 0x477b65, roughness: 0.95 }),
};
export function box(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  w: number,
  h: number,
  d: number,
  mat: T.Material,
) {
  const m = new T.Mesh(new T.BoxGeometry(w, h, d), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
export function cylinder(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  r: number,
  h: number,
  mat: T.Material,
  segments = 12,
) {
  const m = new T.Mesh(new T.CylinderGeometry(r, r, h, segments), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
export function sphere(
  parent: T.Object3D,
  x: number,
  y: number,
  z: number,
  r: number,
  mat: T.Material,
) {
  const m = new T.Mesh(new T.IcosahedronGeometry(r, 1), mat);
  m.position.set(x, y, z);
  parent.add(m);
  return m;
}
export function beam(
  parent: T.Object3D,
  a: T.Vector3,
  b: T.Vector3,
  width: number,
  mat: T.Material,
) {
  const m = new T.Mesh(new T.BoxGeometry(width, a.distanceTo(b), width), mat);
  m.position.copy(a).add(b).multiplyScalar(0.5);
  m.quaternion.setFromUnitVectors(
    new T.Vector3(0, 1, 0),
    b.clone().sub(a).normalize(),
  );
  parent.add(m);
  return m;
}
export function label(text: string, color = "#e5d9bb", size = 128) {
  const c = document.createElement("canvas");
  c.width = 512;
  c.height = size;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.font = `bold ${Math.floor(size * 0.5)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, 256, size / 2);
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  const m = new T.Mesh(
    new T.PlaneGeometry(4, (4 * size) / 512),
    new T.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  return m;
}
export function disposeTree(root: T.Object3D) {
  const geometries = new Set<T.BufferGeometry>(),
    materials = new Set<T.Material>(),
    shared = new Set(Object.values(mats));
  root.traverse((o) => {
    if (o instanceof T.Mesh || o instanceof T.Line) {
      geometries.add(o.geometry);
      for (const m of Array.isArray(o.material) ? o.material : [o.material])
        if (!shared.has(m as any)) materials.add(m);
    }
  });
  for (const g of geometries) g.dispose();
  for (const m of materials) {
    const map = (m as T.MeshBasicMaterial).map;
    map?.dispose();
    m.dispose();
  }
  root.clear();
}
