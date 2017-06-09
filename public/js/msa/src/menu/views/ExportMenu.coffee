MenuBuilder = require "../menubuilder"
FastaExporter = require("biojs-io-fasta").writer
_ = require "underscore"
Exporter = require "../../utils/export"

module.exports = ExportMenu = MenuBuilder.extend

  initialize: (data) ->
    @g = data.g
    @msa = data.msa
    @el.style.display = "inline-block"

  render: ->
    @setName("Export")


    @addNode "Export sequences", =>
      Exporter.saveAsFile @msa, "all.fasta"

    @addNode "Export selection", =>
      Exporter.saveSelection @msa, "selection.fasta"

    @addNode "Export features", =>
      Exporter.saveAnnots @msa, "features.gff3"

    @addNode "Export image", =>
      Exporter.saveAsImg @msa, "biojs-msa.png"

    @el.appendChild @buildDOM()
    @
