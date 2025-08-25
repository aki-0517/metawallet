Image syntax
Marpit has extended Markdown image syntax ![](image.jpg) to help create beautiful slides.

Features	Inline image	Slide BG	Advanced BG
Resizing by keywords	auto only	heavy_check_mark	heavy_check_mark
Resizing by percentage	x	heavy_check_mark	heavy_check_mark
Resizing by length	heavy_check_mark	heavy_check_mark	heavy_check_mark
Image filters	heavy_check_mark	x	heavy_check_mark
Multiple backgrounds	-	x	heavy_check_mark
Split backgrounds	-	x	heavy_check_mark
The extended features are enabled by including corresponding keywords in the image’s alternative text; the remaining alternative text is rendered as alt text for inline images or the figure caption for background images.

Resizing image
You can resize image by using width and height keyword options.

![width:200px](image.jpg) <!-- Setting width to 200px -->
![height:30cm](image.jpg) <!-- Setting height to 300px -->
![width:200px height:30cm](image.jpg) <!-- Setting both lengths -->
Copy to clipboardErrorCopied
We also support the shorthand options w and h. Normally it’s useful to use these.

![w:32 h:32](image.jpg) <!-- Setting size to 32x32 px -->
Copy to clipboardErrorCopied
Inline images only allow auto keyword and the length units defined in CSS.

Several units related to the size of the viewport (e.g. vw, vh, vmin, vmax) cannot use to ensure immutable render result.

Image filters
You can apply CSS filters to image through markdown image syntax. Include <filter-name>(:<param>(,<param>...)) to the alternate text of image.

Filters can use in the inline image and the advanced backgrounds.

Markdown	w/ arguments
![blur]()	![blur:10px]()
![brightness]()	![brightness:1.5]()
![contrast]()	![contrast:200%]()
![drop-shadow]()	![drop-shadow:0,5px,10px,rgba(0,0,0,.4)]()
![grayscale]()	![grayscale:1]()
![hue-rotate]()	![hue-rotate:180deg]()
![invert]()	![invert:100%]()
![opacity]()	![opacity:.5]()
![saturate]()	![saturate:2.0]()
![sepia]()	![sepia:1.0]()
Marpit will use the default arguments shown in above when you omit arguments.

Naturally multiple filters can apply to a image.

![brightness:.8 sepia:50%](https://example.com/image.jpg)
Copy to clipboardErrorCopied
Slide backgrounds
We provide a background image syntax to specify a slide’s background through Markdown. It only has to include bg keyword to the alternate text.

![bg](https://example.com/background.jpg)
Copy to clipboardErrorCopied
When you defined two or more background images in a slide, Marpit will show the last defined image only. If you want to show multiple images, try the advanced backgrounds by enabling inline SVG slide.

Background size
You can resize the background image by keywords. The keyword value basically follows background-size style.

![bg contain](https://example.com/background.jpg)
Copy to clipboardErrorCopied
Keyword	Description	Example
cover	Scale image to fill the slide. (Default)	![bg cover](image.jpg)
contain	Scale image to fit the slide.	![bg contain](image.jpg)
fit	Alias to contain, compatible with Deckset.	![bg fit](image.jpg)
auto	Not scale image, and use the original size.	![bg auto](image.jpg)
x%	Specify the scaling factor by percentage value.	![bg 150%](image.jpg)
You also can continue to use width (w) and height (h) option keywords to specify size by length.

Advanced backgrounds
📐 It will work only in experimental inline SVG slide.

The advanced backgrounds support multiple backgrounds, split backgrounds, and image filters for background.

Multiple backgrounds
![bg](https://fakeimg.pl/800x600/0288d1/fff/?text=A)
![bg](https://fakeimg.pl/800x600/02669d/fff/?text=B)
![bg](https://fakeimg.pl/800x600/67b8e3/fff/?text=C)
Copy to clipboardErrorCopied
Multiple backgrounds

These images will arrange in a horizontal row.

Direction keyword
You may change alignment direction from horizontal to vertical, by using vertical direction keyword.

![bg vertical](https://fakeimg.pl/800x600/0288d1/fff/?text=A)
![bg](https://fakeimg.pl/800x600/02669d/fff/?text=B)
![bg](https://fakeimg.pl/800x600/67b8e3/fff/?text=C)
Copy to clipboardErrorCopied
Multiple backgrounds with vertical direction

Split backgrounds
The left or right keyword with bg keyword make a space for the background to the specified side. It has a half of slide size, and the space of a slide content will shrink too.

![bg left](https://picsum.photos/720?image=29)

# Split backgrounds

The space of a slide content will shrink to the right side.
Copy to clipboardErrorCopied
Split backgrounds

Multiple backgrounds will work well in the specified background side.

![bg right](https://picsum.photos/720?image=3)
![bg](https://picsum.photos/720?image=20)

# Split + Multiple BGs

The space of a slide content will shrink to the left side.
Copy to clipboardErrorCopied
Split + Multiple BGs

This feature is similar to Deckset’s Split Slides.

Marpit uses a last defined keyword in a slide when left and right keyword is mixed in the same slide by using multiple backgrounds.

Split size
Marpit can specify split size for background by percentage like left:33%.

![bg left:33%](https://picsum.photos/720?image=27)

# Split backgrounds with specified size