
document.querySelectorAll('.stepper').forEach(stepper=>{
  const input=stepper.querySelector('input');
  stepper.querySelectorAll('button').forEach(btn=>btn.addEventListener('click',()=>{input.value=Number(input.value||0)+Number(btn.dataset.step||0)}));
});
document.querySelectorAll('.range-field input[type="range"]').forEach(inp=>{
  const out=inp.closest('.range-field').querySelector('output');
  const update=()=>{ if(out) out.textContent=inp.value+'%'; };
  inp.addEventListener('input',update); update();
});
