export async function loadConvocatoria(any){
  const m = await import(`./convocatories/${any}.js`);
  return m[`questions_${any}`];
}
