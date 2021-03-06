#' Run a plotting function and save the output as a PNG
#'
#' This function returns the name of the PNG file that it generates. In
#' essence, it calls \code{png()}, then \code{func()}, then \code{dev.off()}.
#' So \code{func} must be a function that will generate a plot when used this
#' way.
#'
#' For output, it will try to use the following devices, in this order:
#' quartz (via \code{\link[grDevices]{png}}), then \code{\link[Cairo]{CairoPNG}},
#' and finally \code{\link[grDevices]{png}}. This is in order of quality of
#' output. Notably, plain \code{png} output on Linux and Windows may not
#' antialias some point shapes, resulting in poor quality output.
#'
#' In some cases, \code{Cairo()} provides output that looks worse than
#' \code{png()}. To disable Cairo output for an app, use
#' \code{options(shiny.usecairo=FALSE)}.
#'
#' @param func A function that generates a plot.
#' @param filename The name of the output file. Defaults to a temp file with
#'   extension \code{.png}.
#' @param width Width in pixels.
#' @param height Height in pixels.
#' @param res Resolution in pixels per inch. This value is passed to
#'   \code{\link{png}}. Note that this affects the resolution of PNG rendering in
#'   R; it won't change the actual ppi of the browser.
#' @param ... Arguments to be passed through to \code{\link[grDevices]{png}}.
#'   These can be used to set the width, height, background color, etc.
#'
#' @export
plotPNG <- function(func, filename=tempfile(fileext='.png'),
                    width=400, height=400, res=72, ...) {
  # If quartz is available, use png() (which will default to quartz).
  # Otherwise, if the Cairo package is installed, use CairoPNG().
  # Finally, if neither quartz nor Cairo, use png().
  if (capabilities("aqua")) {
    pngfun <- png
  } else if (getOption('shiny.usecairo', TRUE) &&
             nchar(system.file(package = "Cairo"))) {
    # Workaround for issue #140: Cairo ignores res and dpi settings. Need to
    # use regular png function.
    if (res == 72) {
      pngfun <- Cairo::CairoPNG
    } else {
      pngfun <- png
    }
  } else {
    pngfun <- png
  }

  pngfun(filename=filename, width=width, height=height, res=res, ...)
  tryCatch(
    func(),
    finally=dev.off())

  filename
}
