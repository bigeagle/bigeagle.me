document.addEventListener("DOMContentLoaded", function() {
  renderMathInElement(document.body, {
    delimiters: [{left: "$$", right: "$$", display: true}, {left: "$", right: "$", display: false}]
  })

  {
  let element = document.getElementById("my-addr");
  if (element) {
    let eaddr = "justin.w.xd" + "[at]" + "gmail.com"
      element.innerHTML = "<a href='mailto:" + eaddr.replace("[at]", "@") + "'>" + eaddr + "</a>";
    }
  };
});
