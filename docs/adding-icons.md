
# How to Add/Update SVG Icons

This is an example class name for using a font-awesome icon: ``class="icon-sort-alpha-asc"``<br>
Do not use <i>"fa fa-sort-alpha-asc"</i> - that will not work. The following is the reason why.

Below we describe the process of adding SVG icons to the codebase, making icons readily available for use in the UI.

1) Go to [icomoon.io](https://icomoon.io/).
2) Find the icon you want to add, and then download it as SVG into `/public/icon_source/`.
3) At [icomoon.io](https://icomoon.io/), import all the icons from `/public/icon_source/` into a set.  You *must* also then re-add the font-awesome and icomoon-free libraries, and in that order (!!!).  This way class names remain the same.
4) Select all icons in that set, and then generate the font.
5) Download that font (which will come as a zip), and expand it into `/public/js/p3/resources/icomoon/` overwriting the content that is already there.
6) Commit!
