console.log('EDGE FUNCTION STARTED')

Deno.serve(() => {
  console.log('FUNCTION CALLED')
  return new Response('success')
}) 