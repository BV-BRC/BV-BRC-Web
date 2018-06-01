require({cache:{
'url:dojo/resources/dnd.css':{"cssText":".dojoDndAvatar{font-size:75%;color:black;}.dojoDndAvatarHeader td{padding-left:20px;padding-right:4px;height:16px;}.dojoDndAvatarHeader{background:#ccc;}.dojoDndAvatarItem{background:#eee;}.dojoDndMove .dojoDndAvatarHeader{background-image:url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAdRQTFRF////xAAAxgAAxQAAqQAA//7+wgAA5BcZ+aSo+vr6wwAA2AgI2gsN+KKn+fj44BMT/Pz8whgk3xISnE5O5xwfqiwuqBoc4BYW+q+yqSos28jI8ISLsV5etSMj2QoMyQAA70lMwAAA3snJ7Dg80gQE18bGkSoq9VteslBQ805Srg4O18jIoVxc1QYFoVBQzSUn5BobzCAhnRkZnltbt1BR+/r66VRVnQAA5llZ0A0N3B4f9HN51QcIuh4m/vv74xUX42JjrAAA3MfH5Tc40Cgp4xcZ+rG1+ra5wD094kRFsAMD3Q0OzzU11AcH5B4gkQAAuh4n6CIk3Q8Q4RMT4T09tiUl2goKzQICql5e2goLyx0mkAAA+KSo4xUY+amt6TI15x8i3MnJ2hMT3RETqV1dpBkakRgY0kJCm11d7GJkxwAA6B4g1EdH6UtS+Hh6vwAAvAAA9FJV3yssmltbsQYKzyoq+8fJ7CcoogAAqxod2hAR0QQE8WRm18fH1sbGzCgo5hwfiygoxAICsFxc4Swt3hARyBgY8UZK2gwNxQQFujIyoFBQzAIB2QkJwg4T3hAQ4iMk0jA/4i800Ck2rQUHt1JTtFJTogACyggIyxQVkxgY////r0RZCwAAAJx0Uk5T//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8Av2dfGwAAAPlJREFUeNpimA0ETs22goIBMkogNsPs2ZwmE3nzCjXVrSdPFQAJmEpKt4skNCjXZJfnigoABTRcDWLjM/3Y2dnt2SdNm80gFcXfb+Y8QVxIqDWIP7gvkSFFIazFs8iqSo4nspenIzmCoTIwiQEEWIHAzoZbjKHEO4QBBlirVaYzTOG2QAj0hJszpOo6lEm4u8XFcHBw8DLJGzEY+5Z6hHbJarGAACOzDoOqF2Nbek69DxcjIxcjk2Mtw2xh5k5DfZeZzMzMbMxsekCX8jUqMjEyNs2wZGNiU+MEeY5PuIIti4kpv4ClmxPs29mz64rTov1nZWiD2AABBgANUUMsH6hU6gAAAABJRU5ErkJggg==\");background-repeat:no-repeat;}.dojoDndCopy .dojoDndAvatarHeader{background-image:url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAFfKj/FAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAwBQTFRF////tQAA+vr6tgAAtAAAtwAAugAAsgAA1sjIwgMDuAAAzBMTyQUF5lRY28jItl1e0iQj3sjIyhEQvgEBqAABmVBQswAAtgIC1BAQ0g4O41FR1RARtAoKtwoKtgYG2hwezS0ttlBRoQEBrQgL2ico1BAS1iIim1BQqBsdsBkbxwUGmRsb0TQ04yotug0OxQQEmV1dqyosqgkK1A0O5zM1vwICnFBQq11dsAUFwAEBll1dvwUFvAAA61FU3jg50iMinV1d2CgprgAArgQEmhsb3RsesQAApAkJvgIC0w4Q2xga3RsdlQAA609SkgAAulBRl11duQcIsRkcuQAAuxoapgAA0w8QtAQE3C0uiioq2hgYwwMD4yosvwkOuwAAvQEB0QsM3D084UlJpQkJyQUGnhkZzRYVtFBR3jQ1yg0O18jIqyor5jM26HBuyRAQvRobqgAA0gwNp11dzAcI3BkbsAAA3R0fzQwOzxoalhkZ2hga6nh30R4dtAEEu1BRxAUGzwoK0R0c3R0gnxscxQsL1BARjSoq3UJBxgQEvwIB////i4uLjIyMjY2Njo6Oj4+PkJCQkZGRkpKSk5OTlJSUlZWVlpaWl5eXmJiYmZmZmpqam5ubnJycnZ2dnp6en5+foKCgoaGhoqKio6OjpKSkpaWlpqamp6enqKioqampqqqqq6urrKysra2trq6ur6+vsLCwsbGxsrKys7OztLS0tbW1tra2t7e3uLi4ubm5urq6u7u7vLy8vb29vr6+v7+/wMDAwcHBwsLCw8PDxMTExcXFxsbGx8fHyMjIycnJysrKy8vLzMzMzc3Nzs7Oz8/P0NDQ0dHR0tLS09PT1NTU1dXV1tbW19fX2NjY2dnZ2tra29vb3Nzc3d3d3t7e39/f4ODg4eHh4uLi4+Pj5OTk5eXl5ubm5+fn6Ojo6enp6urq6+vr7Ozs7e3t7u7u7+/v8PDw8fHx8vLy8/Pz9PT09fX19vb29/f3+Pj4+fn5+vr6+/v7/Pz8/f39/v7+////HiIvgAAAAIt0Uk5T////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AIXDFe8AAAEzSURBVHjaYuhyZ1D+ARBADBxdDHHWAAHEwPFKp5qhq6mJESCAGLq0A7oYdKv/KDE0fatmZChvamoDCCCGrsiYpnD9zF8MzU28P3/fi2NlKNL6Jpj4J5eZoetXLSMLc1sXQAAxdHVZJbtwdHUx/OKNk2vqaOtiCKn+nVT9liuLIa7l3tc//E2VDFGdcT+/6zT5MLh6/KkT/MZoztDWydrZ2cTSxdDlz8XC7PSrCyDAgOb8Es23zWmq8pKXUf8FNK9LlFenurquia2uulrR2qyLwcBXmv/ljx/VO379esHfxOrAYFTW1BTX/vrPj3d1HU1NzH4MGiU8etVf/wgK/v0pqBPHnMrAF8ujsEtQv8naWlBQgLmAD+jstno25qamziZGRpa2X0BbgECQv02kTZNfEMQGAJv1bGIYdwMjAAAAAElFTkSuQmCC\");background-repeat:no-repeat;}.dojoDndMove .dojoDndAvatarCanDrop .dojoDndAvatarHeader{background-image:url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAKjSURBVHjajFNfSFNhFP993+5tuKlp05iIoc2mbmSztPYQBDnpoYhJJVT03MMggp5820uIvfQQiyAfjUpQIyK09VJZmH+nSUqliIqKNcfu5v7eu9t373U6q4fO4dxzOZzf7zvnfN8hsiwjK/usRHFOvhKeRmd1s+VgXZkSWNiYWxsf/u5PLsKX+iaPIEdIloAQwu+/ip7bl2+53a4bWMIyVhJLEGURRi4fJZIJH98Nyl19Xf2hZ2hjOEnFqR8efGkbCTzteG0bJxMIhCbBMVXAFoMFRwy1eLM5AKM+H7ZUDTo72mdWn0gOhYQU3QSkDfS72i+4OcohlUnCaqzBPdt9yEzdo+eh0+nUKiVJUv+rxSo87nzQF+qVL9GtQXqqrfWKO55KIBjbRDl/SAVnRYhHEI8nVIvEo6qfzsyi6ayzla8kJyk1yx7bmRMMHEQRKYbP8Sh3RowgDCGhWXjbR7YE6OwGwpfDw1UcK2n5IszARE3oPf1iD5gwHTs3tSemDN3x6iiifAymusIWrrDkgHk+OI/3zZ/wLyHanHMDiCSjICJFgk+X0WQqjVBcwHRkAv8rkUSUWQQJhuWC68H1ArHU7PA2IuAdQ33B8T3JU8I4cotQWhDYgYRnQUFcI8SObvvduuszK7OgCxST3tEdEiWZ3qF/tSFbZZWUe4huil/whUfCALvqjCWDBm/TbjsKrkoDqHZY80ou+QGIa/BR2YTh5YHVl2oy3SUJJUO75WctS5pkpB+gXNmwFs6HHnYEDNfyamN5cfbktqef0QCuChf8i36wLBWM5/iKIShPOa0uE1skjcSKHq5Jd1Gqz0DWyxrBTuPM5pgNsZMn2DKJcvrPbQRs7LyfcKIYHtZ7M4wwqyXHsI55+BGEDw34jLfagBX5LcAALB80VcHjUxMAAAAASUVORK5CYII=\");background-repeat:no-repeat;}.dojoDndCopy .dojoDndAvatarCanDrop .dojoDndAvatarHeader{background-image:url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAALASURBVHjajFNNTxNRFD0z0+kEDbRISFtQ2wgoIZGUiKkx8WPRpYSKiYmBxh/QnStjYuLCX2BSXbgSWBBW3WFiExGMSY3RUlu+rA1Cy1g+SiHQ6XRm3vN1SpriijuZ92byzj33nnvf5fC/tcIHG0Iur9Pv7HS6KCXYlGV5a2E7ij2E2RtrhHMN3yKuYvrB4/uBu0O3kS2vY6OYQ1krg2MoK7Xi1+ff+Bb5EUEcDxleayQQMYj467ev+lJ6CqlsChVSQSG1B83QYfEIUFWGFyjOix348ubrIokRb5WEN91Z5KrzXHEWK5srIISgudSCpeerSL/IwKa2Qjc0lI4UxLd/ouuRpw8DmK668rDDNxIMBJZY5N2DAgxiQNEU9Lv769oGPF4oqsKy0WDoBtJHGdiv2wJog49nS+jO8C0sysvQWMHKepnpVtmu1glKumL+V4lVowLK1CgXWW3aEbJ0Djr8OTVrai4uFWHn7bBqEqQmqU5g27fBUXBA4HmsH6xDbSdQ2SN1C35u8Ek/vTx8Bbsbe3g/+gGnsY6XTsg0DzHBasAJBkqVMtxON05rPRd6AcpaaAEsO3t52S10uz6uzeLZ/FM4mpxQmd5uew9GekdMh6nkFJLbSYi8iHQhjbn0J4AptBDIllxiJ3pjVAjyhMNkctIs1GH5CPe6huoE44lxzKRmqj2r3RwRtQw2EeVJHuGNhTQoO6SEgicCOMoxLF9PWRKq4Y4dLTUSqQjoWYR5/Q9iqflExCGdg8JaWGFt0nQN+cOtOkFBKZwsAgGac4ioa4hxxxMhdozx8Zabnr7Mfg5aRQNVCYLXgubxxPeJWvQqlKXelsHiziS8jEjjGsZKdI1hWuqyBWSRXRi9YkYyTahtZ0tAy19E5HdsmOjJYarbmV74mnsQsl4S/AoMF63Kpqzta4iWVhE+XD45zv8EGADyTT+DjqKTvQAAAABJRU5ErkJggg==\");background-repeat:no-repeat;}.dojoDndHandle{cursor:move;}.dojoDndIgnore{cursor:default;}.dj_a11y .dojoDndAvatar{font-size:1em;font-weight:bold;}.dj_a11y .dojoDndAvatarHeader td{padding-left:2px !important;}.dj_a11y .dojoDndAvatarHeader td span{padding-right:5px;}","xCss":"color=;height=;background=;background=;{/4background-image:url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAAoLQ9TAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAdRQTFRF////xAAAxgAAxQAAqQAA//7+wgAA5BcZ+aSo+vr6wwAA2AgI2gsN+KKn+fj44BMT/Pz8whgk3xISnE5O5xwfqiwuqBoc4BYW+q+yqSos28jI8ISLsV5etSMj2QoMyQAA70lMwAAA3snJ7Dg80gQE18bGkSoq9VteslBQ805Srg4O18jIoVxc1QYFoVBQzSUn5BobzCAhnRkZnltbt1BR+/r66VRVnQAA5llZ0A0N3B4f9HN51QcIuh4m/vv74xUX42JjrAAA3MfH5Tc40Cgp4xcZ+rG1+ra5wD094kRFsAMD3Q0OzzU11AcH5B4gkQAAuh4n6CIk3Q8Q4RMT4T09tiUl2goKzQICql5e2goLyx0mkAAA+KSo4xUY+amt6TI15x8i3MnJ2hMT3RETqV1dpBkakRgY0kJCm11d7GJkxwAA6B4g1EdH6UtS+Hh6vwAAvAAA9FJV3yssmltbsQYKzyoq+8fJ7CcoogAAqxod2hAR0QQE8WRm18fH1sbGzCgo5hwfiygoxAICsFxc4Swt3hARyBgY8UZK2gwNxQQFujIyoFBQzAIB2QkJwg4T3hAQ4iMk0jA/4i800Ck2rQUHt1JTtFJTogACyggIyxQVkxgY////r0RZCwAAAJx0Uk5T//////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////8Av2dfGwAAAPlJREFUeNpimA0ETs22goIBMkogNsPs2ZwmE3nzCjXVrSdPFQAJmEpKt4skNCjXZJfnigoABTRcDWLjM/3Y2dnt2SdNm80gFcXfb+Y8QVxIqDWIP7gvkSFFIazFs8iqSo4nspenIzmCoTIwiQEEWIHAzoZbjKHEO4QBBlirVaYzTOG2QAj0hJszpOo6lEm4u8XFcHBw8DLJGzEY+5Z6hHbJarGAACOzDoOqF2Nbek69DxcjIxcjk2Mtw2xh5k5DfZeZzMzMbMxsekCX8jUqMjEyNs2wZGNiU+MEeY5PuIIti4kpv4ClmxPs29mz64rTov1nZWiD2AABBgANUUMsH6hU6gAAAABJRU5ErkJggg==\");background-repeat=;}{/5background-image:url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAMAAAFfKj/FAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAAwBQTFRF////tQAA+vr6tgAAtAAAtwAAugAAsgAA1sjIwgMDuAAAzBMTyQUF5lRY28jItl1e0iQj3sjIyhEQvgEBqAABmVBQswAAtgIC1BAQ0g4O41FR1RARtAoKtwoKtgYG2hwezS0ttlBRoQEBrQgL2ico1BAS1iIim1BQqBsdsBkbxwUGmRsb0TQ04yotug0OxQQEmV1dqyosqgkK1A0O5zM1vwICnFBQq11dsAUFwAEBll1dvwUFvAAA61FU3jg50iMinV1d2CgprgAArgQEmhsb3RsesQAApAkJvgIC0w4Q2xga3RsdlQAA609SkgAAulBRl11duQcIsRkcuQAAuxoapgAA0w8QtAQE3C0uiioq2hgYwwMD4yosvwkOuwAAvQEB0QsM3D084UlJpQkJyQUGnhkZzRYVtFBR3jQ1yg0O18jIqyor5jM26HBuyRAQvRobqgAA0gwNp11dzAcI3BkbsAAA3R0fzQwOzxoalhkZ2hga6nh30R4dtAEEu1BRxAUGzwoK0R0c3R0gnxscxQsL1BARjSoq3UJBxgQEvwIB////i4uLjIyMjY2Njo6Oj4+PkJCQkZGRkpKSk5OTlJSUlZWVlpaWl5eXmJiYmZmZmpqam5ubnJycnZ2dnp6en5+foKCgoaGhoqKio6OjpKSkpaWlpqamp6enqKioqampqqqqq6urrKysra2trq6ur6+vsLCwsbGxsrKys7OztLS0tbW1tra2t7e3uLi4ubm5urq6u7u7vLy8vb29vr6+v7+/wMDAwcHBwsLCw8PDxMTExcXFxsbGx8fHyMjIycnJysrKy8vLzMzMzc3Nzs7Oz8/P0NDQ0dHR0tLS09PT1NTU1dXV1tbW19fX2NjY2dnZ2tra29vb3Nzc3d3d3t7e39/f4ODg4eHh4uLi4+Pj5OTk5eXl5ubm5+fn6Ojo6enp6urq6+vr7Ozs7e3t7u7u7+/v8PDw8fHx8vLy8/Pz9PT09fX19vb29/f3+Pj4+fn5+vr6+/v7/Pz8/f39/v7+////HiIvgAAAAIt0Uk5T////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////////AIXDFe8AAAEzSURBVHjaYuhyZ1D+ARBADBxdDHHWAAHEwPFKp5qhq6mJESCAGLq0A7oYdKv/KDE0fatmZChvamoDCCCGrsiYpnD9zF8MzU28P3/fi2NlKNL6Jpj4J5eZoetXLSMLc1sXQAAxdHVZJbtwdHUx/OKNk2vqaOtiCKn+nVT9liuLIa7l3tc//E2VDFGdcT+/6zT5MLh6/KkT/MZoztDWydrZ2cTSxdDlz8XC7PSrCyDAgOb8Es23zWmq8pKXUf8FNK9LlFenurquia2uulrR2qyLwcBXmv/ljx/VO379esHfxOrAYFTW1BTX/vrPj3d1HU1NzH4MGiU8etVf/wgK/v0pqBPHnMrAF8ujsEtQv8naWlBQgLmAD+jstno25qamziZGRpa2X0BbgECQv02kTZNfEMQGAJv1bGIYdwMjAAAAAElFTkSuQmCC\");background-repeat=;}{/6background-image:url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAAKjSURBVHjajFNfSFNhFP993+5tuKlp05iIoc2mbmSztPYQBDnpoYhJJVT03MMggp5820uIvfQQiyAfjUpQIyK09VJZmH+nSUqliIqKNcfu5v7eu9t373U6q4fO4dxzOZzf7zvnfN8hsiwjK/usRHFOvhKeRmd1s+VgXZkSWNiYWxsf/u5PLsKX+iaPIEdIloAQwu+/ip7bl2+53a4bWMIyVhJLEGURRi4fJZIJH98Nyl19Xf2hZ2hjOEnFqR8efGkbCTzteG0bJxMIhCbBMVXAFoMFRwy1eLM5AKM+H7ZUDTo72mdWn0gOhYQU3QSkDfS72i+4OcohlUnCaqzBPdt9yEzdo+eh0+nUKiVJUv+rxSo87nzQF+qVL9GtQXqqrfWKO55KIBjbRDl/SAVnRYhHEI8nVIvEo6qfzsyi6ayzla8kJyk1yx7bmRMMHEQRKYbP8Sh3RowgDCGhWXjbR7YE6OwGwpfDw1UcK2n5IszARE3oPf1iD5gwHTs3tSemDN3x6iiifAymusIWrrDkgHk+OI/3zZ/wLyHanHMDiCSjICJFgk+X0WQqjVBcwHRkAv8rkUSUWQQJhuWC68H1ArHU7PA2IuAdQ33B8T3JU8I4cotQWhDYgYRnQUFcI8SObvvduuszK7OgCxST3tEdEiWZ3qF/tSFbZZWUe4huil/whUfCALvqjCWDBm/TbjsKrkoDqHZY80ou+QGIa/BR2YTh5YHVl2oy3SUJJUO75WctS5pkpB+gXNmwFs6HHnYEDNfyamN5cfbktqef0QCuChf8i36wLBWM5/iKIShPOa0uE1skjcSKHq5Jd1Gqz0DWyxrBTuPM5pgNsZMn2DKJcvrPbQRs7LyfcKIYHtZ7M4wwqyXHsI55+BGEDw34jLfagBX5LcAALB80VcHjUxMAAAAASUVORK5CYII=\");background-repeat=;}{/7background-image:url(\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAABGdBTUEAAK/INwWK6QAAABl0RVh0U29mdHdhcmUAQWRvYmUgSW1hZ2VSZWFkeXHJZTwAAALASURBVHjajFNNTxNRFD0z0+kEDbRISFtQ2wgoIZGUiKkx8WPRpYSKiYmBxh/QnStjYuLCX2BSXbgSWBBW3WFiExGMSY3RUlu+rA1Cy1g+SiHQ6XRm3vN1SpriijuZ92byzj33nnvf5fC/tcIHG0Iur9Pv7HS6KCXYlGV5a2E7ij2E2RtrhHMN3yKuYvrB4/uBu0O3kS2vY6OYQ1krg2MoK7Xi1+ff+Bb5EUEcDxleayQQMYj467ev+lJ6CqlsChVSQSG1B83QYfEIUFWGFyjOix348ubrIokRb5WEN91Z5KrzXHEWK5srIISgudSCpeerSL/IwKa2Qjc0lI4UxLd/ouuRpw8DmK668rDDNxIMBJZY5N2DAgxiQNEU9Lv769oGPF4oqsKy0WDoBtJHGdiv2wJog49nS+jO8C0sysvQWMHKepnpVtmu1glKumL+V4lVowLK1CgXWW3aEbJ0Djr8OTVrai4uFWHn7bBqEqQmqU5g27fBUXBA4HmsH6xDbSdQ2SN1C35u8Ek/vTx8Bbsbe3g/+gGnsY6XTsg0DzHBasAJBkqVMtxON05rPRd6AcpaaAEsO3t52S10uz6uzeLZ/FM4mpxQmd5uew9GekdMh6nkFJLbSYi8iHQhjbn0J4AptBDIllxiJ3pjVAjyhMNkctIs1GH5CPe6huoE44lxzKRmqj2r3RwRtQw2EeVJHuGNhTQoO6SEgicCOMoxLF9PWRKq4Y4dLTUSqQjoWYR5/Q9iqflExCGdg8JaWGFt0nQN+cOtOkFBKZwsAgGac4ioa4hxxxMhdozx8Zabnr7Mfg5aRQNVCYLXgubxxPeJWvQqlKXelsHiziS8jEjjGsZKdI1hWuqyBWSRXRi9YkYyTahtZ0tAy19E5HdsmOjJYarbmV74mnsQsl4S/AoMF63Kpqzta4iWVhE+XD45zv8EGADyTT+DjqKTvQAAAABJRU5ErkJggg==\");background-repeat=;}cursor=;cursor=;font-weight=;padding-left=;padding-right=;"}}});
define("dgrid/extensions/DnD", [
	"dojo/_base/declare",
	"dojo/_base/lang",
	"dojo/_base/array",
	"dojo/_base/Deferred",
	"dojo/aspect",
	"dojo/on",
	"dojo/topic",
	"dojo/has",
	"dojo/dnd/Source",
	"dojo/dnd/Manager",
	"dojo/_base/NodeList",
	"put-selector/put",
	"../Selection",
	"dojo/has!touch?../util/touch",
	"dojo/has!touch?./_DnD-touch-autoscroll",
	"xstyle/css!dojo/resources/dnd.css"
], function(declare, lang, arrayUtil, Deferred, aspect, on, topic, has, DnDSource, DnDManager, NodeList, put, Selection, touchUtil){
	// Requirements
	// * requires a store (sounds obvious, but not all Lists/Grids have stores...)
	// * must support options.before in put calls
	//   (if undefined, put at end)
	// * should support copy
	//   (copy should also support options.before as above)
	
	// TODOs
	// * consider sending items rather than nodes to onDropExternal/Internal
	// * consider emitting store errors via OnDemandList._trackError
	
	var GridDnDSource = declare(DnDSource, {
		grid: null,
		
		getObject: function(node){
			// summary:
			//		getObject is a method which should be defined on any source intending
			//		on interfacing with dgrid DnD.
			
			var grid = this.grid;
			// Extract item id from row node id (gridID-row-*).
			return grid.store.get(node.id.slice(grid.id.length + 5));
		},
		_legalMouseDown: function(evt){
			// Fix _legalMouseDown to only allow starting drag from an item
			// (not from bodyNode outside contentNode).
			var legal = this.inherited(arguments);
			return legal && evt.target != this.grid.bodyNode;
		},

		// DnD method overrides
		onDrop: function(sourceSource, nodes, copy){
			var targetSource = this,
				targetRow = this._targetAnchor = this.targetAnchor, // save for Internal
				grid = this.grid,
				store = grid.store;
			
			if(!this.before && targetRow){
				// target before next node if dropped within bottom half of this node
				// (unless there's no node to target at all)
				targetRow = targetRow.nextSibling;
			}
			targetRow = targetRow && grid.row(targetRow);
			
			Deferred.when(targetRow && store.get(targetRow.id), function(target){
				// Note: if dropping after the last row, or into an empty grid,
				// target will be undefined.  Thus, it is important for store to place
				// item last in order if options.before is undefined.
				
				// Delegate to onDropInternal or onDropExternal for rest of logic.
				// These are passed the target item as an additional argument.
				if(targetSource != sourceSource){
					targetSource.onDropExternal(sourceSource, nodes, copy, target);
				}else{
					targetSource.onDropInternal(nodes, copy, target);
				}
			});
		},
		onDropInternal: function(nodes, copy, targetItem){
			var grid = this.grid,
				store = grid.store,
				targetSource = this,
				anchor = targetSource._targetAnchor,
				targetRow,
				nodeRow;
			
			if(anchor){ // (falsy if drop occurred in empty space after rows)
				targetRow = this.before ? anchor.previousSibling : anchor.nextSibling;
			}
			
			// Don't bother continuing if the drop is really not moving anything.
			// (Don't need to worry about edge first/last cases since dropping
			// directly on self doesn't fire onDrop, but we do have to worry about
			// dropping last node into empty space beyond rendered rows.)
			nodeRow = grid.row(nodes[0]);
			if(!copy && (targetRow === nodes[0] ||
					(!targetItem && nodeRow && grid.down(nodeRow).element == nodes[0]))){
				return;
			}
			
			nodes.forEach(function(node){
				Deferred.when(targetSource.getObject(node), function(object){
					var id = store.getIdentity(object);
					
					// For copy DnD operations, copy object, if supported by store;
					// otherwise settle for put anyway.
					// (put will relocate an existing item with the same id, i.e. move).
					store[copy && store.copy ? "copy" : "put"](object, {
						before: targetItem
					});
					
					// Self-drops won't cause the dgrid-select handler to re-fire,
					// so update the cached node manually
					if(targetSource._selectedNodes[id]){
						targetSource._selectedNodes[id] = grid.row(id).element;
					}
				});
			});
		},
		onDropExternal: function(sourceSource, nodes, copy, targetItem){
			// Note: this default implementation expects that two grids do not
			// share the same store.  There may be more ideal implementations in the
			// case of two grids using the same store (perhaps differentiated by
			// query), dragging to each other.
			var store = this.grid.store,
				sourceGrid = sourceSource.grid;
			
			// TODO: bail out if sourceSource.getObject isn't defined?
			nodes.forEach(function(node, i){
				Deferred.when(sourceSource.getObject(node), function(object){
					if(!copy){
						if(sourceGrid){
							// Remove original in the case of inter-grid move.
							// (Also ensure dnd source is cleaned up properly)
							Deferred.when(sourceGrid.store.getIdentity(object), function(id){
								!i && sourceSource.selectNone(); // deselect all, one time
								sourceSource.delItem(node.id);
								sourceGrid.store.remove(id);
							});
						}else{
							sourceSource.deleteSelectedNodes();
						}
					}
					// Copy object, if supported by store; otherwise settle for put
					// (put will relocate an existing item with the same id).
					// Note that we use store.copy if available even for non-copy dnd:
					// since this coming from another dnd source, always behave as if
					// it is a new store item if possible, rather than replacing existing.
					store[store.copy ? "copy" : "put"](object, {
						before: targetItem
					});
				});
			});
		},
		
		onDndStart: function(source, nodes, copy){
			// Listen for start events to apply style change to avatar.
			
			this.inherited(arguments); // DnDSource.prototype.onDndStart.apply(this, arguments);
			if(source == this){
				// If TouchScroll is in use, cancel any pending scroll operation.
				if(this.grid.cancelTouchScroll){ this.grid.cancelTouchScroll(); }
				
				// Set avatar width to half the grid's width.
				// Kind of a naive default, but prevents ridiculously wide avatars.
				DnDManager.manager().avatar.node.style.width =
					this.grid.domNode.offsetWidth / 2 + "px";
			}
		},
		
		onMouseDown: function(evt){
			// Cancel the drag operation on presence of more than one contact point.
			// (This check will evaluate to false under non-touch circumstances.)
			if(has("touch") && this.isDragging &&
					touchUtil.countCurrentTouches(evt, this.grid.touchNode) > 1){
				topic.publish("/dnd/cancel");
				DnDManager.manager().stopDrag();
			}else{
				this.inherited(arguments);
			}
		},
		
		onMouseMove: function(evt){
			// If we're handling touchmove, only respond to single-contact events.
			if(!has("touch") || touchUtil.countCurrentTouches(evt, this.grid.touchNode) <= 1){
				this.inherited(arguments);
			}
		},
		
		checkAcceptance: function(source, nodes){
			// Augment checkAcceptance to block drops from sources without getObject.
			return source.getObject &&
				DnDSource.prototype.checkAcceptance.apply(this, arguments);
		},
		getSelectedNodes: function(){
			// If dgrid's Selection mixin is in use, synchronize with it, using a
			// map of node references (updated on dgrid-[de]select events).
			
			if(!this.grid.selection){
				return this.inherited(arguments);
			}
			var t = new NodeList(),
				id;
			for(id in this.grid.selection){
				t.push(this._selectedNodes[id]);
			}
			return t;	// NodeList
		}
		// TODO: could potentially also implement copyState to jive with default
		// onDrop* implementations (checking whether store.copy is available);
		// not doing that just yet until we're sure about default impl.
	});
	
	// Mix in Selection for more resilient dnd handling, particularly when part
	// of the selection is scrolled out of view and unrendered (which we
	// handle below).
	var DnD = declare(Selection, {
		// dndSourceType: String
		//		Specifies the type which will be set for DnD items in the grid,
		//		as well as what will be accepted by it by default.
		dndSourceType: "dgrid-row",
		
		// dndParams: Object
		//		Object containing params to be passed to the DnD Source constructor.
		dndParams: null,
		
		// dndConstructor: Function
		//		Constructor from which to instantiate the DnD Source.
		//		Defaults to the GridSource constructor defined/exposed by this module.
		dndConstructor: GridDnDSource,
		
		postMixInProperties: function(){
			this.inherited(arguments);
			// ensure dndParams is initialized
			this.dndParams = lang.mixin({ accept: [this.dndSourceType] }, this.dndParams);
		},
		
		postCreate: function(){
			this.inherited(arguments);
			
			// Make the grid's content a DnD source/target.
			this.dndSource = new (this.dndConstructor || GridDnDSource)(
				this.bodyNode,
				lang.mixin(this.dndParams, {
					// add cross-reference to grid for potential use in inter-grid drop logic
					grid: this,
					dropParent: this.contentNode
				})
			);
			
			// Set up select/deselect handlers to maintain references, in case selected
			// rows are scrolled out of view and unrendered, but then dragged.
			var selectedNodes = this.dndSource._selectedNodes = {};
			
			function selectRow(row){
				selectedNodes[row.id] = row.element;
			}
			function deselectRow(row){
				delete selectedNodes[row.id];
				// Re-sync dojo/dnd UI classes based on deselection
				// (unfortunately there is no good programmatic hook for this)
				put(row.element, '!dojoDndItemSelected!dojoDndItemAnchor');
			}
			
			this.on("dgrid-select", function(event){
				arrayUtil.forEach(event.rows, selectRow);
			});
			this.on("dgrid-deselect", function(event){
				arrayUtil.forEach(event.rows, deselectRow);
			});
			
			aspect.after(this, "destroy", function(){
				delete this.dndSource._selectedNodes;
				selectedNodes = null;
				this.dndSource.destroy();
			}, true);
		},
		
		insertRow: function(object){
			// override to add dojoDndItem class to make the rows draggable
			var row = this.inherited(arguments),
				type = typeof this.getObjectDndType == "function" ?
					this.getObjectDndType(object) : [this.dndSourceType];
			
			put(row, ".dojoDndItem");
			this.dndSource.setItem(row.id, {
				data: object,
				type: type instanceof Array ? type : [type]
			});
			return row;
		},
		
		removeRow: function (rowElement) {
			this.dndSource.delItem(this.row(rowElement));
			this.inherited(arguments);
		}
	});
	DnD.GridSource = GridDnDSource;
	
	return DnD;
});
