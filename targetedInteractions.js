/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
///////////////////////////////////////////////////////USER CONFIGURATION////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

//Include filter must include the following after the domain: .*clickedElement=.*linkType=[^#]+
//ex. https://example.com.*clickedElement=.*linkType=[^#]+
//add two new Data Layer objects within the sub-folder: clickObject,clickValidation

//when looking for elements to click on, set to true if you'd like it to only select elements that are visible to the viewport
const VISIBLE_LINKS_ONLY = false;
const LINK_TYPES = [
	{
		'selector':'test',
		'linkType':'test',
		'clickData':'test,test' //leave blank if not applicable
	}
];


/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

var clickValidation = {}, clickObject = {'Element Selector' : ''};
async function main () {
	let par = getURLParameters(window.location.href)
	if (par['clickedElement'] && par['linkType']) {
		let selector = decodeURIComponent(par['clickedElement']);
		clickObject['Element Selector'] = selector;
		let clickElement = document.querySelector(selector);
		if (clickElement){
			clickObject['Element Inner Text'] = clickElement.innerText;
			if (clickElement.href) clickObject['href'] = clickElement.href;
			if (par['clickData']) {
				let datas = par['clickData'].split(',');
				datas.forEach(d => {
					clickValidation[d] = (clickElement.getAttribute(d)) ? clickElement.getAttribute(d) : 'DATA ELEMENT MISSING';
				})
			}
			if (clickElement.hasAttribute('target') && clickElement.getAttribute('target') === '_blank') clickElement.setAttribute('target', '_self');
		  simulateClick(clickElement);
			colorElement(clickElement);
			console.log(clickElement)
		} else {
			clickObject = {'Element Selector' : 'ELEMENT NO LONGER AVAILABLE'}
		}
	} else {
		let linkSelectors = await getLinkSelectors(LINK_TYPES);
		linkSelectors.forEach(ls => {
			var newLink = document.createElement('a');
			var queryExists = (!/\?/.test(window.location.href)) ? '?' : '&';
			var clickData = (ls.clickData !== '') ? `&clickData=${encodeURIComponent(ls.clickData)}` : '';
			newLink.href = `${window.location.href}${queryExists}clickedElement=${encodeURIComponent(ls.selector)}&linkType=${encodeURIComponent(ls.linkType)}${clickData}`;
      console.log(newLink.href);
      console.log(document.querySelector(ls.selector));
      document.body.appendChild(newLink);
		})
		console.log(`${linkSelectors.length} links found on page matching configuration`)
	}
}
main();

async function getLinkSelectors(LINK_TYPES) {
	let linkSelectors = new Array ();
	for (const t of LINK_TYPES) {
		if (!t.clickData) t.clickData = '';
		let allLinks = [...document.querySelectorAll(t.selector)];
		if (VISIBLE_LINKS_ONLY) {
			allLinks = await filterViewableElements(allLinks);
		}
    let selectors = allLinks.map(link => {
			let selectorSplit = generateQuerySelector(link).replaceAll(/\s/g,'').split('#');
			if (selectorSplit.length === 1){
				return {'selector':selectorSplit[0],'linkType':t.linkType,'clickData':t.clickData}
			} else {
				return {'selector':`#${selectorSplit[selectorSplit.length -1]}`.replace(/#(.*?)(?=[.>])/, '[id="$1"]').replace(/#(\d+)/, '[id="$1"]'),'linkType':t.linkType,'clickData':t.clickData}
			}
		});
		selectors.forEach(s => {linkSelectors.push(s)});
	};
	return linkSelectors
}

function generateQuerySelector(element) {
  const selectorParts = [];
  let currentElement = element;
  let querylength = 0;
  while (currentElement && currentElement.nodeType === Node.ELEMENT_NODE && querylength !== 1) {
    let selector = currentElement.nodeName.toLowerCase();
    if (currentElement.id) { 
      selector = `#${currentElement.id}`;
      selectorParts.unshift(selector);
      break;
    } else {
      let classes = Array.from(currentElement.classList).map(className => (!/[#:]/.test(className) && !/\d+/.test(className)) ? `.${className}` : '').join('');
      selector += classes;

      if (currentElement.parentElement) {
        const siblings = Array.from(currentElement.parentElement.children);
        const index = siblings.indexOf(currentElement) + 1;
        if (index > 1) {
          selector += `:nth-child(${index})`;
        }
      }
    }
    selectorParts.unshift(selector);
    currentElement = currentElement.parentElement;
    querylength = document.querySelectorAll(selectorParts.join('>')).length;
  }
  return selectorParts.join('>')
}

function getURLParameters(url) {
  var params = {};
  var queryString = url.split('?')[1];
  if (queryString) {
    var pairs = queryString.split('&');
    pairs.forEach(function(pair) {
      var keyValue = pair.split('=');
      var key = decodeURIComponent(keyValue[0]);
      var value = decodeURIComponent(keyValue[1]);
      params[key] = value;
    });
  }
  return params;
}

function simulateClick(element) {
	element.scrollIntoView();
  var clickEvent = new MouseEvent("click", {
    bubbles: true,
    cancelable: true,
    view: window
  });
  element.dispatchEvent(clickEvent);
}

async function colorElement (element) {
	const isVisible = await isElementInViewport(element);

	if (isVisible) {
		element.style.color = 'black';
		element.style.backgroundColor = 'yellow';
		element.style.border = '2px solid red';
		element.style.opacity = 100;
	} else {
		colorElement(element.parentElement)
	}
}

async function filterViewableElements (elements) {
	let results = elements.map(el => {return isElementInViewport(el)});
	results = await Promise.all(results);
	let ret = new Array();
	results.forEach((r,index) => {if (r) ret.push(elements[index])});
	return ret
}

async function isElementInViewport(element) {
  return await new Promise(resolve => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        resolve(entry.isIntersecting);
      });
    });

    observer.observe(element);
  });
}