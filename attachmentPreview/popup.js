async function generateThumbs() {
  let url = new URL(window.location.href);
  let tabId = parseInt(url.searchParams.get("tabId"), 10);
  
  let messages = await browser.messageDisplay.getDisplayedMessages(tabId);
  if (messages.length != 1)
    return;
  
  let attachments = await messenger.messages.listAttachments(messages[0].id);
  for (let attachment of attachments) {    
    let file = await browser.messages.getAttachmentFile(
      messages[0].id,
      attachment.partName
    );
    
    let reader = new FileReader();
    attachment.url = await new Promise((resolve) => {
      reader.onload = (e) => {
        resolve(e.target.result);
      };
      reader.readAsDataURL(file);
    });
    
    // Using an html template.
    let id = `attachmentElement_${messages[0].id}_${attachment.partName}`;
    let t = document.querySelector('#attachmentTemplate');
    t.content.querySelector("div").id = id;
    if (attachment.contentType.toLowerCase().startsWith("image/"))
      t.content.querySelector("img").src = attachment.url;
    else
      t.content.querySelector("img").display = "none";
    
    t.content.querySelector("p").textContent = attachment.name;
    document.body.appendChild(document.importNode(t.content, true));
    
    // Event listeners cannot be attached to documentFragments before being added
    // to the DOM. Find the new element.
    let attachmentElement = document.getElementById(id);
    for (let button of attachmentElement.querySelectorAll("button")) {
      button.setAttribute("data-message-id", messages[0].id);
      button.setAttribute("data-attachment-part-name", attachment.partName);
      button.addEventListener("click", clickHandler);
    }
  }  
}

async function clickHandler(e) {
  const file = await browser.messages.getAttachmentFile(
    parseInt(e.target.dataset.messageId, 10),
    e.target.dataset.attachmentPartName
  );
  const objectURL = URL.createObjectURL(file);

  switch (e.target.getAttribute("action")) {
    case "open": {
      let id = await browser.downloads.download({
        filename: `_temp_${file.name}`,
        saveAs: false,
        url: objectURL,
      });
      browser.downloads.open(id);
    }
    break;
    
    case "download": {
      await browser.downloads.download({
        filename: file.name,
        saveAs: true,
        url: objectURL,
      });
      // revoking directly broke the download for me :-(
      //URL.revokeObjectURL(objectURL);
    }
    break;
  }
}

generateThumbs();