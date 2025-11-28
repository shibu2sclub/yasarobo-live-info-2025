function showNextDom(parentDom, newDom) {
    outDomList = Array.from(parentDom.getElementsByClassName("out"));
    outDomList.forEach(element => {
        element.remove();
    });
    const currentElement = parentDom.getElementsByClassName("in")[0];
    // console.log(currentElement);
    if (currentElement != undefined) {
        currentElement.classList.remove("in");
        currentElement.classList.add("out");
    }
    newDom.classList.add("in");
    parentDom.append(newDom);
}