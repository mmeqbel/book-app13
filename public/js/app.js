const updateButton=document.getElementById("update-button")
const updateForm=document.getElementById("update-form")
updateForm.style.display='none'
updateButton.addEventListener("click",(event)=>{
    console.log(updateForm.style.display)
    if (updateForm.style.display=='block') {
        updateForm.style.display='none'
    } else {
        updateForm.style.display="block"
    }
});
